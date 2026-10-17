"use client";

import {
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  FileSignature,
  MessageCircle,
  ReceiptText,
  Send,
} from "lucide-react";
import styles from "@/app/demo/sales-copilot/pulse.module.css";

const demoAttentionCases = [
  {
    amount: 870_000,
    company: "GreenLine",
    owner: "Айгуль",
    title: "Монтаж завершён 2 дня назад, остаток не получен.",
    reason: "Бухгалтер не подтвердил поступление оплаты.",
    aiAction: "AI спросил бухгалтера 18 минут назад. Ответа нет.",
    level: "critical",
    decision: true,
    icon: ReceiptText,
  },
  {
    amount: 1_200_000,
    company: "Nova City",
    owner: "Арман",
    title: "Договор отправлен 4 дня назад.",
    reason: "Клиент снова спросил о сроках, но не получил конкретную дату.",
    aiAction: "Менеджеру отправлена подсказка 7 минут назад.",
    level: "warning",
    decision: false,
    icon: FileSignature,
  },
  {
    amount: 750_000,
    company: "Alem Residence",
    owner: "Айдар",
    title: "Клиент с высоким намерением ждёт 46 минут.",
    reason: "Время ответа менеджера выросло с 11 до 38 минут.",
    aiAction: "AI напомнил менеджеру и уведомил руководителя.",
    level: "warning",
    decision: true,
    icon: Clock3,
  },
] as const;

const demoRiskAmount = demoAttentionCases.reduce((sum, item) => sum + item.amount, 0);

export type LiveAttentionCase = {
  id: string;
  customerName: string;
  managerName: string;
  stageLabel: string;
  waitingMinutes: number;
  temperature: "cold" | "warm" | "hot";
};

function money(value: number) {
  if (value >= 1_000_000) {
    return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value / 1_000_000)} млн ₸`;
  }
  return `${new Intl.NumberFormat("ru-RU").format(value / 1_000)} тыс. ₸`;
}

function duration(minutes: number) {
  if (minutes < 60) return `${minutes} мин`;
  if (minutes < 1_440) return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(minutes / 60)} ч`;
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(minutes / 1_440)} дня`;
}

export function OwnerAttention({
  onOpenSignals,
  liveCases,
}: {
  onOpenSignals: () => void;
  liveCases?: LiveAttentionCase[];
}) {
  if (liveCases) {
    return (
      <section className={styles.attentionSection} id="attention-cases" aria-labelledby="attention-title">
        <header>
          <div><span><CircleAlert /> Приоритет владельца</span><h2 id="attention-title">{liveCases.length ? "Требует вашего внимания" : "Срочных сигналов нет"}</h2><p>{liveCases.length ? "Показаны только клиенты, которым компания просрочила обещанное действие." : "Все обязательства компании сейчас находятся в пределах SLA."}</p></div>
          <button onClick={onOpenSignals}>Все сигналы <ChevronRight /></button>
        </header>
        {liveCases.length ? <div className={styles.attentionGrid}>
          {liveCases.slice(0, 3).map((item) => (
            <article className={`${styles.attentionCase} ${styles.attentionWarning}`} key={item.id}>
              <div className={styles.attentionCaseTop}>
                <span><Clock3 /></span>
                <div><small>{item.stageLabel} · {item.managerName}</small><strong>{item.customerName}</strong></div>
                <em>{item.temperature === "hot" ? "Горячий клиент" : "Нужно ответить"}</em>
              </div>
              <h3>Клиент ждёт действие компании {duration(item.waitingMinutes)}.</h3>
              <p>Обещанный следующий шаг просрочен по SLA.</p>
              <footer><span><small>Что уже сделано</small><b>Сигнал зафиксирован и добавлен в очередь менеджера.</b></span></footer>
            </article>
          ))}
        </div> : null}
      </section>
    );
  }
  return (
    <section className={styles.attentionSection} id="attention-cases" aria-labelledby="attention-title">
      <header>
        <div><span><CircleAlert /> Приоритет владельца</span><h2 id="attention-title">Требует вашего внимания</h2><p>Причины уже определены — читать переписки не нужно.</p></div>
        <button onClick={onOpenSignals}>Все сигналы <ChevronRight /></button>
      </header>
      <div className={styles.attentionGrid}>
        {demoAttentionCases.map((item) => {
          const Icon = item.icon;
          return (
            <article className={`${styles.attentionCase} ${item.level === "critical" ? styles.attentionCritical : styles.attentionWarning}`} key={item.company}>
              <div className={styles.attentionCaseTop}>
                <span><Icon /></span>
                <div><small>{item.company} / {item.owner}</small><strong>{money(item.amount)}</strong></div>
                <em>{item.decision ? "Нужно ваше решение" : "AI уже действует"}</em>
              </div>
              <h3>{item.title}</h3>
              <p>{item.reason}</p>
              <footer><span><small>Что уже сделано</small><b>{item.aiAction.replaceAll("AI ", "Система ")}</b></span></footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function OwnerCommandCenter({
  revenue,
  expectedAmount,
  averageCheck,
  averageDealMinutes,
  aiObservation,
  aiAdvice,
  updatedAt,
  riskAmountValue,
  opportunityAmount,
  overdueCount,
  automatedActions,
}: {
  revenue: number;
  expectedAmount: number;
  averageCheck: number;
  averageDealMinutes: number;
  aiObservation: string;
  aiAdvice: string;
  updatedAt: string;
  riskAmountValue?: number;
  opportunityAmount?: number;
  overdueCount?: number;
  automatedActions?: number;
}) {
  const riskAmount = riskAmountValue ?? demoRiskAmount;
  const opportunity = opportunityAmount ?? 1_620_000;
  const overdue = overdueCount ?? 5;
  const automated = automatedActions ?? 3;
  const monthlyPlan = 18_000_000;
  const remainingToPlan = Math.max(0, monthlyPlan - revenue);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(0, daysInMonth - now.getDate());
  const monthName = new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(now);
  return (
    <>
      <section className={styles.commandCenter} aria-label="Резюме состояния бизнеса">
        <article className={styles.aiBriefing}>
          <header>
            <span>Резюме бизнеса</span>
            <time>обновлено {updatedAt}</time>
          </header>
          <h2><strong>{money(riskAmount)}</strong> требуют внимания</h2>
          <div className={styles.aiBriefingMetrics}>
            <span><ReceiptText /><small>Средний чек</small><strong>{money(averageCheck)}</strong><em>по закрытым сделкам</em></span>
            <span><Clock3 /><small>Цикл сделки</small><strong>{duration(averageDealMinutes)}</strong><em>от заявки до оплаты</em></span>
          </div>
          <div className={styles.aiObservation}>
            <div><small>Наблюдение системы</small><strong>{aiObservation}</strong><p><b>Рекомендация:</b> {aiAdvice}</p></div>
          </div>
          <div className={styles.aiInterventionStatus}>
            <span>{automated} действий выполнено автоматически</span>
            <span><CircleAlert /> {overdue} решений ожидают владельца</span>
          </div>
          <button onClick={() => document.querySelector("#attention-cases")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            Показать причины <ChevronDown />
          </button>
          <div className={styles.aiCoverage} aria-label="Источники наблюдения">
            <small>Система анализирует</small>
            <span><MessageCircle /> WhatsApp</span>
            <span><Send /> Telegram</span>
          </div>
        </article>

        <article className={styles.moneyState}>
          <header><div><h2>План продаж на месяц</h2><p>Факт, остаток и время до конца месяца</p></div><CircleCheck /></header>
          <div className={styles.moneyStateGrid}>
            <div><small>Получено в {monthName}</small><strong>{money(revenue)}</strong><span>{Math.round(revenue / monthlyPlan * 100)}% месячного плана</span></div>
            <div><small>План месяца · {monthName}</small><strong>{money(monthlyPlan)}</strong><span>утверждённая цель сети</span></div>
            <div className={styles.moneyAtRisk}><small>Осталось до плана</small><strong>{money(remainingToPlan)}</strong><span>в активной воронке {money(expectedAmount)}</span></div>
            <div className={styles.moneyOpportunity}><small>До конца месяца</small><strong>{daysRemaining} дней</strong><span>ближайший потенциал {money(opportunity)}</span></div>
          </div>
        </article>
      </section>

    </>
  );
}
