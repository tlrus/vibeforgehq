import { createHmac, timingSafeEqual } from "node:crypto";

const graphVersion = process.env.WHATSAPP_API_VERSION || "v23.0";
const graphUrl = `https://graph.facebook.com/${graphVersion}`;
export const hasWhatsAppConfig = () => Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);

async function sendMessage(payload:Record<string,unknown>){
  if(!hasWhatsAppConfig())return null;
  const response=await fetch(`${graphUrl}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,{method:"POST",headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",...payload})});
  if(!response.ok)throw new Error("WhatsApp send failed");
  const body=await response.json() as {messages?:{id:string}[]};return body.messages?.[0]?.id??null;
}
export function sendWhatsAppText(to:string,text:string){return sendMessage({to,type:"text",text:{body:text,preview_url:true}})}
export function sendWhatsAppButtons(to:string,text:string,buttons:{id:string;title:string}[]){return sendMessage({to,type:"interactive",interactive:{type:"button",body:{text},action:{buttons:buttons.slice(0,3).map(button=>({type:"reply",reply:button}))}}})}
export function sendWhatsAppImage(to:string,url:string,caption?:string){return sendMessage({to,type:"image",image:{link:url,...(caption&&{caption})}})}
export function sendWhatsAppDocument(to:string,url:string,filename?:string,caption?:string){return sendMessage({to,type:"document",document:{link:url,...(filename&&{filename}),...(caption&&{caption})}})}

export async function downloadWhatsAppMedia(mediaId:string){
  if(!process.env.WHATSAPP_ACCESS_TOKEN)throw new Error("WhatsApp is not configured");
  const metadata=await fetch(`${graphUrl}/${mediaId}`,{headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`}});if(!metadata.ok)throw new Error("Media metadata failed");
  const {url,mime_type,file_size}=await metadata.json() as {url:string;mime_type?:string;file_size?:number};
  if(file_size&&file_size>10*1024*1024)throw new Error("Media is too large");
  const response=await fetch(url,{headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`}});if(!response.ok)throw new Error("Media download failed");
  const data=await response.arrayBuffer();if(data.byteLength>10*1024*1024)throw new Error("Media is too large");
  return {data,mimeType:mime_type||response.headers.get("content-type")||"application/octet-stream"};
}
export function verifyWhatsAppSignature(rawBody:string,signature:string|null){
  const secret=process.env.WHATSAPP_APP_SECRET;if(!secret)return process.env.DEMO_MODE==="true";
  if(!signature?.startsWith("sha256="))return false;
  const expected=Buffer.from(createHmac("sha256",secret).update(rawBody).digest("hex"));const received=Buffer.from(signature.slice(7));
  return expected.length===received.length&&timingSafeEqual(expected,received);
}
