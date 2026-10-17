"use client";

import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Bot, BriefcaseBusiness, Check, CircleDollarSign, Goal, Headphones, ListChecks, MessageCircle, Phone, PhoneMissed, Sparkles, TrendingUp } from "lucide-react";
import { calculateIncome, formatMoney, getPaymentTier, managerProfile, type ManagerTask } from "./manager-data";
import styles from "@/app/pilot/manager/manager.module.css";

type ManagerHomeProps = {
  currentTask?: ManagerTask;
  remaining: number;
  completed: number;
  onComplete: (id: string) => void;
  onNoAnswer: (id: string) => void;
  onOpenWorkflow: () => void;
  onOpenGoals: () => void;
  onInjectReply: () => void;
};

export function ManagerHome({ currentTask, remaining, completed, onComplete, onNoAnswer, onOpenWorkflow, onOpenGoals, onInjectReply }: ManagerHomeProps) {
  const income = calculateIncome(managerProfile.currentSales);
  const zone = getPaymentTier(managerProfile.currentSales);
  const progress = Math.min(100, (managerProfile.currentSales / managerProfile.plan) * 100);

  return (
    <main className={styles.main}>
      <section className={styles.welcome}>
        <div><span><Sparkles /> Рабочий день под контролем</span><h1>Данияр, следующий шаг уже выбран</h1><p>AI собрал задачи из CRM и поставил первой ту, которая сильнее всего влияет на деньги сегодня.</p></div>
        <button onClick={onOpenWorkflow}><ListChecks /> Весь поток <b>{remaining}</b><ArrowRight /></button>
      </section>

      <section className={styles.commandGrid} aria-label="Главный экран менеджера">
        <aside className={styles.performanceCard}>
          <header><span>Мои показатели</span><strong>{zone.label}</strong></header>
          <div className={styles.salesAmount}><small>Продажи в этом месяце</small><strong>{formatMoney(managerProfile.currentSales)}</strong><div><i style={{ width: `${progress}%` }} /></div><span>{Math.round(progress)}% от цели {formatMoney(managerProfile.plan)}</span></div>
          <dl className={styles.metricList}>
            <div><dt><Phone /> Звонки</dt><dd>{managerProfile.calls}</dd><small>+8 сегодня</small></div>
            <div><dt><MessageCircle /> Диалоги</dt><dd>{managerProfile.conversations}</dd><small>{managerProfile.conversion}% в сделку</small></div>
            <div><dt><CircleDollarSign /> Принёс</dt><dd>{formatMoney(managerProfile.currentSales)}</dd><small>{managerProfile.deals} оплат</small></div>
          </dl>
          <div className={styles.incomeStrip}><span><BadgeDollarSign /><small>Доход сейчас</small></span><strong>{formatMoney(income.total)}</strong><button onClick={onOpenGoals}>Рассчитать цель</button></div>
        </aside>

        <section className={styles.aiFocus}>
          {currentTask ? (
            <>
              <header><span><Bot /> AI выбрал следующий шаг</span><em>{currentTask.priority}</em></header>
              <div className={styles.clientFocus}><div><small>{currentTask.product} · {currentTask.stage}</small><h2>{currentTask.client}</h2><p>{currentTask.action}</p></div><strong>{formatMoney(currentTask.value)}</strong></div>
              <div className={styles.signalRow}><span>{currentTask.temperature}</span><span>{currentTask.wait}</span><span>{currentTask.kind === "call" ? "Звонок" : "Сообщение"}</span></div>
              <div className={styles.aiReason}><Sparkles /><div><strong>Почему сейчас</strong><p>{currentTask.insight}</p></div></div>
              <div className={styles.script}><small>Сказать клиенту</small><blockquote>«{currentTask.script}»</blockquote><span>Контекст: {currentTask.context}</span></div>
              <div className={styles.focusActions}>
                <button className={styles.secondaryAction} onClick={() => onNoAnswer(currentTask.id)}><PhoneMissed /> Не дозвонился</button>
                <button className={styles.primaryAction} onClick={() => onComplete(currentTask.id)}><Check /> Выполнено</button>
              </div>
              <button className={styles.simulateReply} onClick={onInjectReply}>Демо: клиент ответил → перестроить очередь</button>
            </>
          ) : <div className={styles.dayComplete}><Check /><h2>Поток закрыт</h2><p>Все задачи на сегодня выполнены.</p></div>}
        </section>

        <aside className={styles.toolsCard}>
          <header><span>Рабочие инструменты</span><small>Открываются без поиска</small></header>
          <div className={styles.toolGrid}>
            <Link href="/pilot/crm"><BriefcaseBusiness /><span><strong>CRM</strong><small>Клиенты и сделки</small></span><ArrowRight /></Link>
            <button onClick={onOpenWorkflow}><MessageCircle /><span><strong>Чаты</strong><small>{remaining} требуют шага</small></span><ArrowRight /></button>
            <button onClick={onOpenWorkflow}><Headphones /><span><strong>Звонки</strong><small>8 запланировано</small></span><ArrowRight /></button>
            <button onClick={onOpenGoals}><Goal /><span><strong>Моя цель</strong><small>До зелёной зоны</small></span><ArrowRight /></button>
          </div>
          <div className={styles.dailyProgress}><span><TrendingUp /><small>Выполнено сегодня</small></span><strong>{completed} / {completed + remaining}</strong><div><i style={{ width: `${completed + remaining ? (completed / (completed + remaining)) * 100 : 100}%` }} /></div></div>
        </aside>
      </section>

      <section className={styles.heroBar} aria-label="Профиль и вклад менеджера">
        <div className={styles.heroAvatar}>ДК<i /></div>
        <div className={styles.heroIdentity}><span>Менеджер уровня {managerProfile.level}</span><strong>{managerProfile.name}</strong><small>{managerProfile.workDays} дней в команде · {managerProfile.deals} оплат в этом месяце</small></div>
        <div className={styles.heroExperience}><span><small>Опыт до уровня {managerProfile.level + 1}</small><b>{managerProfile.xp}%</b></span><div><i style={{ width: `${managerProfile.xp}%` }} /></div></div>
        <div className={styles.heroValue}><small>Ваш вклад за всё время</small><strong>{formatMoney(managerProfile.lifetimeRevenue)}</strong><span>{managerProfile.companyContribution}% выручки команды</span></div>
      </section>
    </main>
  );
}
