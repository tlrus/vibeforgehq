import { z } from "zod";

const nullableString = z.string().nullable();
const nullableNumber = z.number().int().nonnegative().nullable();
export const extractedFieldsSchema = z.object({
  objectType: nullableString, windowType: nullableString, quantity: nullableNumber,
  widthMm: nullableNumber, heightMm: nullableNumber, profileMaterial: nullableString,
  openingSashes: nullableNumber, openingType: nullableString, openingDirection: nullableString,
  profileColor: nullableString, glassType: nullableString, extras: z.array(z.string()),
  city: nullableString, customerName: nullableString,
});
export const conversationAnalysisSchema = z.object({
  reply: z.string().min(1).max(500), detectedIntent: z.string().min(1).max(80),
  extractedFields: extractedFieldsSchema, needsHuman: z.boolean(), confidence: z.number().min(0).max(1),
  leadTemperature: z.enum(["cold", "warm", "hot"]),
  painSummary: nullableString,
  needSummary: nullableString,
});
export type ConversationAnalysis = z.infer<typeof conversationAnalysisSchema>;
type ExtractedFields = z.infer<typeof extractedFieldsSchema>;

export const conversationJsonSchema = {
  type:"object", additionalProperties:false,
  required:["reply","detectedIntent","extractedFields","needsHuman","confidence","leadTemperature","painSummary","needSummary"],
  properties:{
    reply:{type:"string"}, detectedIntent:{type:"string"}, needsHuman:{type:"boolean"}, confidence:{type:"number",minimum:0,maximum:1},
    leadTemperature:{type:"string",enum:["cold","warm","hot"]},painSummary:{type:["string","null"]},needSummary:{type:["string","null"]},
    extractedFields:{type:"object",additionalProperties:false,required:["objectType","windowType","quantity","widthMm","heightMm","profileMaterial","openingSashes","openingType","openingDirection","profileColor","glassType","extras","city","customerName"],properties:{
      objectType:{type:["string","null"]},windowType:{type:["string","null"]},quantity:{type:["integer","null"]},widthMm:{type:["integer","null"]},heightMm:{type:["integer","null"]},profileMaterial:{type:["string","null"]},openingSashes:{type:["integer","null"]},openingType:{type:["string","null"]},openingDirection:{type:["string","null"]},profileColor:{type:["string","null"]},glassType:{type:["string","null"]},extras:{type:"array",items:{type:"string"}},city:{type:["string","null"]},customerName:{type:["string","null"]}
    }}
  }
} as const;

const emptyFields = (): ExtractedFields => ({objectType:null,windowType:null,quantity:null,widthMm:null,heightMm:null,profileMaterial:null,openingSashes:null,openingType:null,openingDirection:null,profileColor:null,glassType:null,extras:[],city:null,customerName:null});

export function fallbackAnalyze(message:string):ConversationAnalysis{
  const low=message.toLowerCase();const fields=emptyFields();
  const painSummary=/продува|сквозня|холод|теплопотер/.test(low)?"Холод, сквозняк или теплопотери":/шум|слышно/.test(low)?"Недостаточная шумоизоляция":/стар(ые|ое)|сломал|не закрыва/.test(low)?"Старые или неисправные конструкции":null;
  const needSummary=/двер/.test(low)?"Подбор и установка двери":/балкон|лоджи/.test(low)?"Остекление или утепление балкона":/окн/.test(low)?"Подбор и установка окон":null;
  const leadTemperature=/срочно|готов|заказ|замер|договор|когда установ/.test(low)?"hot":/цен|стоим|расч[её]т|размер|подобрат/.test(low)?"warm":"cold";
  if(/менеджер|человек|оператор/.test(low))return {reply:"Конечно, передаю ваш запрос менеджеру.",detectedIntent:"request_human",extractedFields:fields,needsHuman:true,confidence:.98,leadTemperature,painSummary,needSummary};
  const size=low.match(/(\d{2,4})\s*(?:на|x|х|×)\s*(\d{2,4})/);if(size){let w=Number(size[1]),h=Number(size[2]);if(w<1000)w*=10;if(h<1000)h*=10;fields.widthMm=w;fields.heightMm=h;}
  const quantity=low.match(/(\d+|одно|два|две|три|четыре)\s+(?:белых?\s+)?(?:окон|окна|окно)/);if(quantity)fields.quantity=wordNumber(quantity[1]);
  if(/бел/.test(low))fields.profileColor="Белый";else if(/антрацит/.test(low))fields.profileColor="Антрацит";else if(/дуб/.test(low))fields.profileColor="Дуб";
  if(/не знаю размер|размеры неизвест/.test(low))return {reply:"Можно продолжить без точных размеров. Фотография поможет предварительно подобрать конфигурацию, но точные размеры определит замерщик.",detectedIntent:"unknown_dimensions",extractedFields:fields,needsHuman:false,confidence:.95,leadTemperature,painSummary,needSummary};
  fields.extras=["Монтаж","Демонтаж","Москитная сетка","Подоконник","Откосы","Доставка"].filter(value=>low.includes(value.toLowerCase()));
  const hasData=Object.values(fields).some(value=>Array.isArray(value)?value.length>0:value!==null);
  return {reply:hasData?"Спасибо, я сохранил указанные параметры.":"Не совсем понял сообщение. Пожалуйста, выберите один из вариантов ниже.",detectedIntent:fields.extras.length?"provide_extras":size?"provide_dimensions":hasData?"provide_details":"unclear",extractedFields:fields,needsHuman:false,confidence:hasData?.9:.25,leadTemperature,painSummary,needSummary};
}
function wordNumber(value:string){return ({одно:1,два:2,две:2,три:3,четыре:4} as Record<string,number>)[value]??Number(value);}
