import { conversationAnalysisSchema, conversationJsonSchema, fallbackAnalyze, type ConversationAnalysis } from "./openai-analysis";

export type OpenAIUsage = {
  provider: "openai" | "fallback";
  model: string;
  inputTokens: number;
  outputTokens: number;
};

const systemPrompt=`Ты анализатор сообщений клиента оконной компании. Используй модель только для понимания текста, классификации намерения, извлечения явно названных параметров и короткого естественного ответа.
Никогда не рассчитывай цену, не придумывай размеры или скидки, не обещай сроки, не определяй финальную стоимость и не утверждай, что изменил базу данных.
  Если значение не названо явно, верни null. Размеры "140 на 150" в бытовом контексте интерпретируй как 1400x1500 мм. Ответ должен быть коротким и содержать не более одного вопроса.
  Дополнительно классифицируй температуру лида: cold — общий интерес без намерения, warm — обсуждает цену/варианты/размеры, hot — готов к замеру, договору или заказу. painSummary и needSummary заполняй только из явно сказанного клиентом, не додумывай.`;

export async function analyzeWithOpenAI(message:string):Promise<{analysis:ConversationAnalysis;source:"openai"|"fallback";usage:OpenAIUsage}>{
  const model=process.env.OPENAI_MODEL||"gpt-5-mini";
  if(!process.env.OPENAI_API_KEY)return {analysis:fallbackAnalyze(message),source:"fallback",usage:{provider:"fallback",model:"fallback",inputTokens:0,outputTokens:0}};
  try{
    const response=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model,messages:[{role:"system",content:systemPrompt},{role:"user",content:message}],response_format:{type:"json_schema",json_schema:{name:"window_conversation_analysis",strict:true,schema:conversationJsonSchema}}}),signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error("OpenAI unavailable");
    const body=await response.json() as {choices?:{message?:{content?:string}}[];usage?:{prompt_tokens?:number;completion_tokens?:number}};
    const content=body.choices?.[0]?.message?.content;if(!content)throw new Error("Empty response");
    return {analysis:conversationAnalysisSchema.parse(JSON.parse(content)),source:"openai",usage:{provider:"openai",model,inputTokens:body.usage?.prompt_tokens??0,outputTokens:body.usage?.completion_tokens??0}};
  }catch{return {analysis:fallbackAnalyze(message),source:"fallback",usage:{provider:"fallback",model:"fallback",inputTokens:0,outputTokens:0}};}
}

export async function summarizeWithOpenAI(facts:unknown):Promise<string>{
  const fallback="Клиент заполняет заявку на подбор окна. Параметры и дальнейшие действия указаны в карточке заявки.";
  if(!process.env.OPENAI_API_KEY)return fallback;
  try{const response=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-5-mini",messages:[{role:"system",content:"Составь для менеджера нейтральное резюме заявки на русском в 2–3 предложениях. Используй только переданные факты. Не рассчитывай цену, не придумывай размеры, скидки или сроки."},{role:"user",content:JSON.stringify(facts)}],max_completion_tokens:180}),signal:AbortSignal.timeout(12000)});if(!response.ok)return fallback;const body=await response.json() as {choices?:{message?:{content?:string}}[]};return body.choices?.[0]?.message?.content||fallback}catch{return fallback}
}
