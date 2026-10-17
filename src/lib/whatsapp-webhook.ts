import { randomBytes, randomUUID } from "node:crypto";
import { applyAnalysis, getQuestion, getQuickReplies, initialSession, type EngineSession, type WindowAnswers } from "./conversation-engine";
import { analyzeWithOpenAI } from "./openai-server";
import { getSupabaseServerClient } from "./supabase/server";
import { syncLeadToTwenty } from "./twenty-crm";
import { downloadWhatsAppMedia, sendWhatsAppButtons, sendWhatsAppText } from "./whatsapp";
import type { WhatsAppMessage, WhatsAppWebhook } from "./whatsapp-types";

const demoProcessed=new Set<string>();
export async function processWhatsAppWebhook(payload:WhatsAppWebhook){
  for(const entry of payload.entry??[])for(const change of entry.changes??[]){const value=change.value;
    for(const status of value?.statuses??[])await updateDeliveryStatus(status.id,status.status);
    for(const message of value?.messages??[])await processIncoming(message,value?.contacts?.[0]?.profile?.name);
  }
}

async function processIncoming(message:WhatsAppMessage,whatsappName?:string){
  try{
    if(await isDuplicate(message.id))return;
    const context=await findOrCreateLead(message.from,whatsappName);if(!context)return;
    await syncLeadToTwenty({externalId:context.leadId,name:context.name||whatsappName||"Новый клиент",phone:message.from,source:"WhatsApp",stage:context.state||"NEW",manager:context.manager,leadTemperature:"cold",updatedAt:new Date().toISOString()}).catch(()=>undefined);
    const rawText=getMessageText(message);await saveMessage(context.conversationId,message.id,"CLIENT",message.type,rawText||null,null);
    if(message.type==="image"&&message.image){await handlePhoto(context.leadId,context.conversationId,message);return}
    if(message.type==="audio"&&message.audio){const transcription=await handleAudio(context.leadId,message);await saveTranscription(message.id,transcription);if(transcription)await handleText(context,message.from,transcription);else await sendAndSave(context.conversationId,message.from,"Не удалось распознать голосовое сообщение. Пожалуйста, напишите ответ текстом.");return}
    if(message.type==="document"&&message.document){await handleDocument(context.leadId,message);await sendAndSave(context.conversationId,message.from,"Документ получен и прикреплён к заявке.");return}
    if(rawText)await handleText(context,message.from,rawText);
  }catch{/* Meta already received HTTP 200; operational errors stay server-side. */}
}

async function handleText(context:{leadId:string;conversationId:string;state?:string;answers?:WindowAnswers;name?:string;manager?:string|null},phone:string,text:string){
  const {analysis}=await analyzeWithOpenAI(text);const session:EngineSession={state:(context.state as EngineSession["state"])||initialSession.state,answers:context.answers||{}};
  const next=applyAnalysis(session,text,analysis);await persistConversationState(context.leadId,next,analysis);
  await syncLeadToTwenty({externalId:context.leadId,name:next.answers.customerName||context.name||"Новый клиент",phone,source:"WhatsApp",stage:next.state,manager:context.manager,leadTemperature:analysis.leadTemperature,painSummary:analysis.painSummary,needSummary:analysis.needSummary,updatedAt:new Date().toISOString()}).catch(()=>undefined);
  const question=getQuestion(next);const reply=analysis.confidence>=.65&&analysis.reply!==question&&!analysis.reply.includes("?")?`${analysis.reply} ${question}`:question;
  const options=getQuickReplies(next)||[];let externalId:string|null=null;
  if(options.length>0&&options.length<=3)externalId=await sendWhatsAppButtons(phone,reply,options.map((title,index)=>({id:`${next.state.toLowerCase()}_${index}`,title:title.slice(0,20)})));
  else externalId=await sendWhatsAppText(phone,reply);
  await saveMessage(context.conversationId,externalId,"AI","text",reply,null);
}

async function handlePhoto(leadId:string,conversationId:string,message:WhatsAppMessage){
  const media=await downloadWhatsAppMedia(message.image!.id);if(!["image/jpeg","image/png","image/webp"].includes(media.mimeType))throw new Error("Unsupported image");
  const url=await storeMedia(leadId,media.data,media.mimeType,"photos");const client=getSupabaseServerClient();if(client&&url)await client.from("customer_photos").insert({lead_id:leadId,original_url:url});
  const token=randomBytes(32).toString("base64url");if(client)await client.from("selection_links").insert({lead_id:leadId,token,expires_at:new Date(Date.now()+86400000).toISOString(),active:true});
  const link=`${process.env.NEXT_PUBLIC_APP_URL||"http://localhost:3000"}/select/${token}`;const reply=`Я подобрал несколько подходящих вариантов. Откройте ссылку и выберите окно, которое вам нравится: ${link}`;
  await sendAndSave(conversationId,message.from,reply);await persistConversationState(leadId,{state:"PRODUCT_SELECTION",answers:{photo:url||"received",selectionToken:token}});
}
async function handleAudio(leadId:string,message:WhatsAppMessage){const media=await downloadWhatsAppMedia(message.audio!.id);await storeMedia(leadId,media.data,media.mimeType,"audio");return transcribeAudio(media.data,media.mimeType)}
async function handleDocument(leadId:string,message:WhatsAppMessage){const media=await downloadWhatsAppMedia(message.document!.id);await storeMedia(leadId,media.data,media.mimeType,"documents")}
async function transcribeAudio(data:ArrayBuffer,mimeType:string){if(!process.env.OPENAI_API_KEY)return "";try{const form=new FormData();form.append("model","gpt-4o-mini-transcribe");form.append("file",new Blob([data],{type:mimeType}),`voice.${extension(mimeType)}`);const response=await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:form,signal:AbortSignal.timeout(20000)});if(!response.ok)return "";return ((await response.json()) as {text?:string}).text||""}catch{return ""}}

function getMessageText(message:WhatsAppMessage){return message.text?.body||message.interactive?.button_reply?.title||message.interactive?.list_reply?.title||message.button?.text||message.image?.caption||message.document?.caption||""}
async function isDuplicate(id:string){const client=getSupabaseServerClient();if(!client){if(demoProcessed.has(id))return true;demoProcessed.add(id);if(demoProcessed.size>1000)demoProcessed.clear();return false}const {data}=await client.from("messages").select("id").eq("external_message_id",id).maybeSingle();return Boolean(data)}
async function findOrCreateLead(phone:string,name?:string){const client=getSupabaseServerClient();if(!client)return {leadId:`demo-${phone}`,conversationId:`demo-conversation-${phone}`,state:initialSession.state,answers:{},name:name||"Новый клиент",manager:null};let {data:lead}=await client.from("leads").select("id,current_state,customer_name,whatsapp_name,assigned_manager").eq("whatsapp_phone",phone).maybeSingle();if(!lead){const result=await client.from("leads").insert({whatsapp_phone:phone,whatsapp_name:name,customer_name:name,status:"NEW",current_state:"SELECT_ACTION"}).select("id,current_state,customer_name,whatsapp_name,assigned_manager").single();lead=result.data}if(!lead)return null;let {data:conversation}=await client.from("conversations").select("id").eq("lead_id",lead.id).maybeSingle();if(!conversation){const result=await client.from("conversations").insert({lead_id:lead.id}).select("id").single();conversation=result.data}const {data:config}=await client.from("window_configurations").select("*").eq("lead_id",lead.id).maybeSingle();return {leadId:lead.id,conversationId:conversation!.id,state:lead.current_state,answers:configToAnswers(config),name:lead.customer_name||lead.whatsapp_name||name||"Новый клиент",manager:lead.assigned_manager||null}}
function configToAnswers(config:Record<string,unknown>|null):WindowAnswers{return config?{objectType:config.object_type as string,windowType:config.window_type as string,quantity:config.quantity as number,width:config.width_mm as number,height:config.height_mm as number,profile:config.profile_material as string,openingSashes:config.opening_sashes as number,openingType:config.opening_type as string,openingDirection:config.opening_direction as string,color:config.profile_color as string,glassType:config.glass_type as string}: {}}
async function persistConversationState(leadId:string,session:EngineSession,analysis?:import("./openai-analysis").ConversationAnalysis){const client=getSupabaseServerClient();if(!client)return;await client.from("leads").update({current_state:session.state,customer_name:session.answers.customerName||undefined,city:session.answers.city||undefined,lead_temperature:analysis?.leadTemperature,pain_summary:analysis?.painSummary||undefined,need_summary:analysis?.needSummary||undefined,qualification_confidence:analysis?.confidence}).eq("id",leadId);const a=session.answers;await client.from("window_configurations").upsert({lead_id:leadId,object_type:a.objectType,window_type:a.windowType,quantity:a.quantity,width_mm:a.width,height_mm:a.height,profile_material:a.profile,sash_count:undefined,opening_sashes:a.openingSashes,opening_type:a.openingType,opening_direction:a.openingDirection,profile_color:a.color,glass_type:a.glassType,mosquito_net:a.extras?.includes("Москитная сетка")||false,window_sill:a.extras?.includes("Подоконник")||false,slopes:a.extras?.includes("Откосы")||false,dismantling:a.extras?.includes("Демонтаж")||false,installation:a.extras?.includes("Монтаж")||false,delivery:a.extras?.includes("Доставка")||false},{onConflict:"lead_id"})}
async function saveMessage(conversationId:string,externalId:string|null,sender:string,type:string,text:string|null,mediaUrl:string|null){const client=getSupabaseServerClient();if(client)await client.from("messages").insert({conversation_id:conversationId,external_message_id:externalId,sender_type:sender,message_type:type,text,media_url:mediaUrl,delivery_status:sender==="CLIENT"?"received":"sent"})}
async function saveTranscription(externalId:string,text:string){const client=getSupabaseServerClient();if(client)await client.from("messages").update({transcription:text}).eq("external_message_id",externalId)}
async function updateDeliveryStatus(externalId:string,status:string){const client=getSupabaseServerClient();if(client)await client.from("messages").update({delivery_status:status}).eq("external_message_id",externalId)}
async function sendAndSave(conversationId:string,to:string,text:string){const id=await sendWhatsAppText(to,text);await saveMessage(conversationId,id,"AI","text",text,null)}
async function storeMedia(leadId:string,data:ArrayBuffer,mimeType:string,folder:string){const client=getSupabaseServerClient();if(!client)return null;const path=`${folder}/${leadId}/${randomUUID()}.${extension(mimeType)}`;const bucket=process.env.SUPABASE_STORAGE_BUCKET||"vibeforge-windows";const result=await client.storage.from(bucket).upload(path,data,{contentType:mimeType,upsert:false});if(result.error)throw result.error;return client.storage.from(bucket).getPublicUrl(path).data.publicUrl}
function extension(mime:string){return ({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","audio/ogg":"ogg","audio/mpeg":"mp3","audio/mp4":"m4a","application/pdf":"pdf"} as Record<string,string>)[mime]||"bin"}
