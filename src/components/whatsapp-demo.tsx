"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bot, Check, CheckCheck, ExternalLink, ImagePlus, MoreVertical, Paperclip, Play, RotateCcw, Send, UserRound, Wifi } from "lucide-react";
import { advanceFollowup, applyAnalysis, firstBotMessage, getQuestion, getQuickReplies, initialSession, processMessage, type EngineSession } from "@/lib/conversation-engine";
import type { ConversationAnalysis } from "@/lib/openai-analysis";

type ChatMessage = { id:number; sender:"bot"|"client"|"manager"; text:string };

export function WhatsAppDemo(){
  const [session,setSession]=useState<EngineSession>(initialSession); const [text,setText]=useState("");
  const [messages,setMessages]=useState<ChatMessage[]>([{id:1,sender:"bot",text:firstBotMessage}]);
  const [scenarioRunning,setScenarioRunning]=useState(false);const [scenarioStep,setScenarioStep]=useState(0);
  const messageId=useRef(2); const bottom=useRef<HTMLDivElement>(null); useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth"})},[messages]);
  const replies=getQuickReplies(session)||[];

  async function answer(value:string){
    if(!value.trim())return;
    const followup=["PRODUCT_SELECTION","REVIEW","CALCULATION","QUOTE","WAITING_FOR_MANAGER","MANAGER_TAKEOVER"].includes(session.state);
    let next=followup?advanceFollowup(session):processMessage(session,value);let naturalReply="";
    if(!followup){try{const response=await fetch("/api/conversation/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:value})});const result=await response.json() as {analysis:ConversationAnalysis};next=applyAnalysis(session,value,result.analysis);naturalReply=result.analysis.reply}catch{/* Rule-based result is already ready. */}}
    const outgoing:ChatMessage={id:messageId.current++,sender:"client",text:value};
    const question=getQuestion(next);const response=naturalReply&&naturalReply!==question&&!naturalReply.includes("?")?`${naturalReply} ${question}`:naturalReply||question; setMessages(current=>[...current,outgoing,{id:messageId.current++,sender:"bot",text:response}]); setSession(next);setText("");
  }
  function reset(){setSession(initialSession);setMessages([{id:1,sender:"bot",text:firstBotMessage}]);}
  async function runReadyScenario(){if(scenarioRunning)return;setScenarioRunning(true);setScenarioStep(0);setMessages([]);setSession(initialSession);for(let i=0;i<demoScenario.length;i++){await new Promise(resolve=>setTimeout(resolve,550));const step=demoScenario[i];setMessages(current=>[...current,{id:messageId.current++,sender:step.sender,text:step.text}]);setScenarioStep(i+1);if(i===2)setSession({state:"PHOTO",answers:demoAnswers});if(i===4)setSession({state:"PRODUCT_SELECTION",answers:{...demoAnswers,photo:"/demo-room.svg",selectionToken:demoToken}});if(i===7)setSession({state:"QUOTE",answers:{...demoAnswers,photo:"/demo-room.svg",selectionToken:demoToken}});if(i===9)setSession({state:"MANAGER_TAKEOVER",answers:{...demoAnswers,photo:"/demo-room.svg",selectionToken:demoToken}})}setScenarioRunning(false)}
  return <main className="conversation-page">
    <div className="conversation-top"><a href="/admin"><ArrowLeft/>Вернуться в админку</a><button className="ready-scenario" disabled={scenarioRunning} onClick={runReadyScenario}><Play/>{scenarioRunning?`Сценарий ${scenarioStep}/${demoScenario.length}`:"Запустить готовый сценарий"}</button><span><Wifi/>Симулятор · правила + OpenAI fallback</span><button onClick={reset}><RotateCcw/>Начать заново</button></div>
    <section className="conversation-chat"><header><div className="wa-avatar">VF</div><div><strong>VibeForge Windows</strong><small><i/>AI-консультант в сети</small></div><MoreVertical/></header>
      <div className="engine-state"><Bot/>Состояние: <b>{session.state}</b></div>
      <div className="conversation-messages"><div className="wa-encryption">🔒 Демо-диалог хранится только в браузере</div><div className="day">Сегодня</div>
        {messages.map(message=><div className={`wa-msg ${message.sender==="client"?"in":"out"} ${message.sender==="manager"?"manager-message":""}`} key={message.id}>{message.sender==="manager"&&<b className="manager-label">Менеджер Алия</b>}{linkify(message.text)}<small>сейчас <CheckCheck/></small></div>)}<div ref={bottom}/>
      </div>
      {replies.length>0&&<div className="quick-replies">{replies.map(reply=><button key={reply} onClick={()=>answer(reply)}>{reply}</button>)}</div>}
      <form className="conversation-input" onSubmit={event=>{event.preventDefault();answer(text)}}><button type="button" onClick={()=>answer("Прикрепить тестовое фото")} aria-label="Прикрепить фото"><Paperclip/></button><input value={text} onChange={event=>setText(event.target.value)} placeholder="Напишите ответ…"/><button aria-label="Отправить"><Send/></button></form>
    </section>
    <LeadCard session={session}/>
  </main>;
}

function LeadCard({session}:{session:EngineSession}){const a=session.answers;const rows=[
  ["Действие",a.action],["Объект",a.objectType],["Тип окна",a.windowType],["Количество",a.quantity],["Размер",a.width===null||a.height===null?"Уточнит замерщик":a.width&&a.height?`${a.width} × ${a.height} мм`:undefined],
  ["Профиль",a.profile],["Открывающихся створок",a.openingSashes],["Открывание",a.openingType],["Направление",a.openingDirection],["Цвет",a.color],["Стеклопакет",a.glassType],["Город",a.city],["Клиент",a.customerName]
];return <aside className="conversation-lead"><div className="lead-card-title"><div><span>Демо-заявка</span><h1>{a.customerName||"Новый клиент"}</h1><p>Заполняется во время диалога</p></div><span className="live-dot">В работе</span></div>
  <div className="progress"><span><i style={{width:`${Math.min(100,Object.values(a).filter(Boolean).length/15*100)}%`}}/></span><small>Собрано {Object.values(a).filter(value=>value!==undefined).length} из 15 параметров</small></div>
  <section><h2>Конфигурация</h2><dl>{rows.map(([label,value])=><div className={value!==undefined?"filled":""} key={String(label)}><dt>{value!==undefined?<Check/>:<i/>}{label}</dt><dd>{value===undefined?"Не указано":String(value)}</dd></div>)}</dl></section>
  <section><h2>Дополнительные опции</h2>{a.extras?.length?<div className="answer-tags">{a.extras.map(x=><span key={x}>{x}</span>)}</div>:<p className="muted-answer">Пока не выбраны</p>}</section>
  <section className="photo-status"><h2>Фотография</h2>{a.photo?<div><ImagePlus/><span><strong>{a.photo==="SKIPPED"?"Без фотографии":"Фото проёма получено"}</strong><small>{a.photo==="SKIPPED"?"Можно продолжить":"Готово к подбору"}</small></span></div>:<p className="muted-answer">Ожидаем от клиента</p>}</section>
  {a.selectionToken&&<Link className="selection-link" href={`/select/${a.selectionToken}`}><ExternalLink/>Открыть подборку</Link>}
  <div className="lead-owner"><UserRound/><span><small>Ответственный</small><strong>{session.state==="MANAGER_TAKEOVER"?"Менеджер Алия":"AI-консультант"}</strong></span></div>
  </aside>}
function linkify(text:string){const [before,path]=text.split(/(?=\/select\/)/);return path?<>{before}<Link className="inline-link" href={path}>{path}</Link></>:text;}
const demoToken=`demo-${"n".repeat(32)}`;const demoAnswers={action:"Рассчитать окно",objectType:"Квартира",windowType:"Двухстворчатое",quantity:2,width:1400,height:1500,profile:"ПВХ усиленный",openingSashes:1,openingType:"Поворотно-откидное",openingDirection:"Внутрь",color:"Белый",glassType:"Энергосберегающий",extras:["Москитная сетка","Демонтаж","Монтаж"],city:"Алматы",customerName:"Нурлан"};
const demoScenario:{sender:ChatMessage["sender"];text:string}[]=[
  {sender:"client",text:"Здравствуйте! Нужно рассчитать два одинаковых окна для квартиры."},
  {sender:"bot",text:"Здравствуйте, Нурлан! Уточните тип, размеры, профиль и желаемые опции."},
  {sender:"client",text:"Двухстворчатые, 1400 на 1500 мм, ПВХ усиленный, одна открывающаяся створка, поворотно-откидное открывание, белые, энергосберегающий стеклопакет. Нужны сетка, демонтаж и монтаж. Город Алматы."},
  {sender:"client",text:"📷 Фотография оконного проёма отправлена."},
  {sender:"bot",text:`Я подобрал несколько подходящих вариантов. Откройте ссылку и выберите окно, которое вам нравится: /select/${demoToken}`},
  {sender:"client",text:"Выбрал Comfort Duo Plus, белый профиль и энергосберегающий стеклопакет."},
  {sender:"bot",text:"Окно размещено на фотографии. Положение и размер можно поправить вручную перед сохранением."},
  {sender:"bot",text:"Предварительный расчёт готов: показана детализация и диапазон ±15%."},
  {sender:"bot",text:"Коммерческое предложение создано и готово к отправке в PDF."},
  {sender:"bot",text:"Передаю заявку менеджеру. AI отключён для этого диалога."},
  {sender:"manager",text:"Здравствуйте! Получил вашу заявку и предварительный расчёт. Когда вам будет удобно принять замерщика?"},
];
