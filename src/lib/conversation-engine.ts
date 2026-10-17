export const conversationStates = ["START","SELECT_ACTION","OBJECT_TYPE","WINDOW_TYPE","QUANTITY","WIDTH","HEIGHT","PROFILE","OPENING_SASHES","OPENING_TYPE","OPENING_DIRECTION","COLOR","GLASS_TYPE","EXTRAS","LOCATION","CUSTOMER_NAME","PHOTO","PRODUCT_SELECTION","REVIEW","CALCULATION","QUOTE","WAITING_FOR_MANAGER","MANAGER_TAKEOVER","COMPLETED"] as const;
export type ConversationState = typeof conversationStates[number];

export type WindowAnswers = {
  action?: string; objectType?: string; windowType?: string; quantity?: number;
  width?: number | null; height?: number | null; profile?: string; openingSashes?: number;
  openingType?: string; openingDirection?: string; color?: string; glassType?: string;
  extras?: string[]; city?: string; customerName?: string; photo?: string; selectionToken?: string;
};
export type EngineSession = { state: ConversationState; answers: WindowAnswers; notice?: string };
type ExtractedAnalysis = { detectedIntent:string; needsHuman:boolean; confidence:number; reply:string; extractedFields:{objectType:string|null;windowType:string|null;quantity:number|null;widthMm:number|null;heightMm:number|null;profileMaterial:string|null;openingSashes:number|null;openingType:string|null;openingDirection:string|null;profileColor:string|null;glassType:string|null;extras:string[];city:string|null;customerName:string|null} };

export const firstBotMessage = "Здравствуйте! Я AI-консультант оконной компании. Помогу подобрать окно, выполнить предварительный расчёт и передать заявку менеджеру. Что вам нужно?";
export const initialSession: EngineSession = { state: "SELECT_ACTION", answers: {} };

const steps: { state: ConversationState; key: keyof WindowAnswers; question: string; options?: string[] }[] = [
  { state:"SELECT_ACTION", key:"action", question:firstBotMessage, options:["Рассчитать окно","Рассчитать балконный блок","Связаться с менеджером"] },
  { state:"OBJECT_TYPE", key:"objectType", question:"Где будет установлено окно?", options:["Квартира","Частный дом","Офис","Коммерческое помещение","Строящийся объект"] },
  { state:"WINDOW_TYPE", key:"windowType", question:"Какой тип окна нужен?", options:["Одностворчатое","Двухстворчатое","Трёхстворчатое","Балконный блок","Не знаю"] },
  { state:"QUANTITY", key:"quantity", question:"Сколько одинаковых окон нужно?" },
  { state:"WIDTH", key:"width", question:"Какая примерная ширина в миллиметрах?", options:["Не знаю"] },
  { state:"HEIGHT", key:"height", question:"Какая примерная высота в миллиметрах?", options:["Не знаю"] },
  { state:"PROFILE", key:"profile", question:"Какой профиль нужен?", options:["ПВХ стандарт","ПВХ усиленный","Алюминий","Не знаю"] },
  { state:"OPENING_SASHES", key:"openingSashes", question:"Сколько створок должно открываться?", options:["0","1","2","3"] },
  { state:"OPENING_TYPE", key:"openingType", question:"Какой тип открывания?", options:["Поворотное","Откидное","Поворотно-откидное","Раздвижное","Не знаю"] },
  { state:"OPENING_DIRECTION", key:"openingDirection", question:"Какое направление открывания?", options:["Влево","Вправо","Внутрь","Не важно"] },
  { state:"COLOR", key:"color", question:"Какой цвет профиля?", options:["Белый","Антрацит","Дуб","Другой"] },
  { state:"GLASS_TYPE", key:"glassType", question:"Какой стеклопакет нужен?", options:["Стандартный","Энергосберегающий","Шумоизоляционный","Тонированный","Не знаю"] },
  { state:"EXTRAS", key:"extras", question:"Какие дополнительные опции нужны? Можно выбрать несколько.", options:["Москитная сетка","Подоконник","Откосы","Демонтаж","Монтаж","Доставка","Готово"] },
  { state:"LOCATION", key:"city", question:"В каком городе находится объект?" },
  { state:"CUSTOMER_NAME", key:"customerName", question:"Как к вам обращаться?" },
  { state:"PHOTO", key:"photo", question:"Отправьте фотографию окна или проёма.", options:["Прикрепить тестовое фото","Продолжить без фото"] },
];

export function getStep(session: EngineSession) { return steps.find((step) => step.state === session.state); }
export function getQuestion(session: EngineSession) { return session.notice || getStep(session)?.question || followupQuestion(session.state, session.answers); }
export function getQuickReplies(session: EngineSession) { return getStep(session)?.options ?? followupOptions(session.state); }

export function processMessage(session: EngineSession, raw: string): EngineSession {
  const answers = { ...session.answers }; const text = raw.trim(); const low = text.toLowerCase();
  if (/связаться с менеджером|позовите менеджера|менеджер/.test(low)) return { state:"WAITING_FOR_MANAGER", answers };
  extractAll(low, text, answers);
  const current = getStep(session);
  if (current && answers[current.key] === undefined) assignCurrent(current.key, text, low, answers);
  if (session.state === "EXTRAS" && low !== "готово") return { state:"EXTRAS", answers };
  if (session.state === "PHOTO") answers.photo = low.includes("без фото") ? "SKIPPED" : "demo-opening.jpg";
  const missing = steps.slice(1).find((step) => answers[step.key] === undefined);
  if (missing) {
    const dimensionsSkipped = (answers.width === null || answers.height === null) && (missing.state !== "WIDTH" && missing.state !== "HEIGHT");
    return { state:missing.state, answers, notice:dimensionsSkipped ? "Можно продолжить без точных размеров. Фотография поможет предварительно подобрать конфигурацию, но точные размеры определит замерщик." : undefined };
  }
  const token = answers.selectionToken ?? `demo-${crypto.randomUUID().replaceAll("-","")}`;
  return { state:"PRODUCT_SELECTION", answers:{...answers, selectionToken:token} };
}

export function advanceFollowup(session: EngineSession): EngineSession {
  const order: ConversationState[] = ["PRODUCT_SELECTION","REVIEW","CALCULATION","QUOTE","WAITING_FOR_MANAGER","MANAGER_TAKEOVER","COMPLETED"];
  const index = order.indexOf(session.state); return { ...session, state:order[Math.min(index + 1, order.length - 1)] };
}

export function applyAnalysis(session:EngineSession,raw:string,analysis:ExtractedAnalysis):EngineSession{
  if(analysis.needsHuman)return {state:"WAITING_FOR_MANAGER",answers:{...session.answers}};
  if(analysis.confidence<.65)return {...session,notice:analysis.reply};
  const base=processMessage(session,raw);const f=analysis.extractedFields;const answers={...base.answers};
  const values:Partial<WindowAnswers>={objectType:f.objectType??undefined,windowType:f.windowType??undefined,quantity:f.quantity??undefined,width:f.widthMm??undefined,height:f.heightMm??undefined,profile:f.profileMaterial??undefined,openingSashes:f.openingSashes??undefined,openingType:f.openingType??undefined,openingDirection:f.openingDirection??undefined,color:f.profileColor??undefined,glassType:f.glassType??undefined,extras:f.extras.length?f.extras:undefined,city:f.city??undefined,customerName:f.customerName??undefined};
  Object.entries(values).forEach(([key,value])=>{if(value!==undefined)(answers as Record<string,unknown>)[key]=value});
  if(analysis.detectedIntent==="unknown_dimensions"){answers.width=null;answers.height=null;}
  const missing=steps.slice(1).find(step=>answers[step.key]===undefined);
  return missing?{state:missing.state,answers}:{state:base.state==="PRODUCT_SELECTION"?base.state:"PHOTO",answers};
}

function extractAll(low:string, original:string, a:WindowAnswers) {
  const object = [["квартир","Квартира"],["частн","Частный дом"],["офис","Офис"],["коммер","Коммерческое помещение"],["строящ","Строящийся объект"]].find(([key])=>low.includes(key)); if(object)a.objectType=object[1];
  const window = [["одноствор","Одностворчатое"],["двухствор","Двухстворчатое"],["трёхствор","Трёхстворчатое"],["балкон","Балконный блок"]].find(([key])=>low.includes(key)); if(window)a.windowType=window[1];
  const profile = [["усиленн","ПВХ усиленный"],["алюмин","Алюминий"],["пвх","ПВХ стандарт"]].find(([key])=>low.includes(key)); if(profile)a.profile=profile[1];
  const glass = [["энергосбер","Энергосберегающий"],["шумо","Шумоизоляционный"],["тонир","Тонированный"],["стандартн","Стандартный"]].find(([key])=>low.includes(key)); if(glass)a.glassType=glass[1];
  const size=low.match(/(\d{3,4})\s*[xх×]\s*(\d{3,4})/); if(size){a.width=Number(size[1]);a.height=Number(size[2]);}
  const qty=low.match(/(\d+)\s*(окн|штук|шт)/); if(qty)a.quantity=Number(qty[1]);
  const extras=["москитная сетка","подоконник","откосы","демонтаж","монтаж","доставка"].filter(x=>low.includes(x)); if(extras.length)a.extras=[...new Set([...(a.extras||[]),...extras.map(capitalize)])];
  if(/рассчитать балкон/.test(low)){a.action="Рассчитать балконный блок";a.windowType="Балконный блок";} else if(/рассчитать окно/.test(low))a.action="Рассчитать окно";
  if(low.startsWith("меня зовут "))a.customerName=original.slice(11).trim();
}
function assignCurrent(key:keyof WindowAnswers,text:string,low:string,a:WindowAnswers){
  if((key==="width"||key==="height")&&/не знаю|без размер/.test(low)){a[key]=null;return;}
  if(key==="quantity"||key==="openingSashes"){const n=low.match(/\d+/);if(n)a[key]=Number(n[0]);return;}
  if(key==="extras"){a.extras=low==="готово"?(a.extras||[]):[...new Set([...(a.extras||[]),text])];return;}
  if(key==="photo")return;
  (a as Record<string,unknown>)[key]=text;
}
function followupQuestion(state:ConversationState,a:WindowAnswers){
  if(state==="PRODUCT_SELECTION")return `Я подобрал несколько подходящих вариантов. Откройте ссылку и выберите окно, которое вам нравится: /select/${a.selectionToken}`;
  return ({REVIEW:"Проверьте собранные параметры. Всё верно?",CALCULATION:"Выполняю предварительный расчёт…",QUOTE:"Предварительный расчёт готов. Передать заявку менеджеру?",WAITING_FOR_MANAGER:"Передаю заявку менеджеру. Пожалуйста, ожидайте.",MANAGER_TAKEOVER:"Менеджер подключился к диалогу.",COMPLETED:"Спасибо! Заявка завершена."} as Partial<Record<ConversationState,string>>)[state]||"";
}
function followupOptions(state:ConversationState){return ({PRODUCT_SELECTION:["Я выбрал вариант"],REVIEW:["Всё верно"],CALCULATION:["Показать расчёт"],QUOTE:["Передать менеджеру"],WAITING_FOR_MANAGER:["Подключить менеджера"],MANAGER_TAKEOVER:["Завершить диалог"]} as Partial<Record<ConversationState,string[]>>)[state];}
function capitalize(value:string){return value[0].toUpperCase()+value.slice(1);}
