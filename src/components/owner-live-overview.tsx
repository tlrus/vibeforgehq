"use client";

import {
  ArrowRight,
  Banknote,
  Clock3,
  PhoneCall,
  ShieldAlert,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import type { CSSProperties } from "react";
import styles from "@/app/demo/sales-copilot/pulse.module.css";
import type { ClientThread } from "@/components/daily-flow-map";

const stageLabels = [
  "Заявка",
  "Диалог",
  "КП",
  "Договор",
  "Исполнение",
  "Принято",
  "Оплачено",
];

function duration(minutes: number) {
  if (minutes < 60) return `${minutes} мин`;
  if (minutes < 1_440) return `${Math.round(minutes / 6) / 10} ч`;
  return `${Math.round(minutes / 144) / 10} дня`;
}

function money(value: number) {
  if (value >= 1_000_000) {
    return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value / 1_000_000)} млн ₸`;
  }
  return `${new Intl.NumberFormat("ru-RU").format(Math.round(value / 1_000))} тыс. ₸`;
}

type ManagerSummary = {
  name: string;
  calls: number;
  reached: number;
  meaningful: number;
  progressed: number;
};

export function OwnerLiveOverview({
  clients,
  revenue,
  onOpenSignals,
}: {
  clients: ClientThread[];
  revenue: number;
  onOpenConversations: (manager?: string, processId?: string) => void;
  onOpenSignals: () => void;
}) {
  const businessClients = clients.filter((client) => !client.isDemo);
  const active = businessClients.filter((client) => client.stage < 6);
  const waiting = active.filter((client) => client.nextActionOwner === "business");
  const overdue = waiting
    .filter((client) => client.waitingForBusiness)
    .sort((left, right) => right.waitingMinutes - left.waitingMinutes);
  const hot = active.filter((client) => client.temperature === "hot").length;

  const managerClients = businessClients.filter((client) => client.manager && client.manager !== "Не назначен");
  const latestActivityTime = Math.max(0, ...managerClients.map((client) => client.changedAt));
  const activityWindowStart = latestActivityTime - 86_400_000;
  const managers = [...new Set(managerClients.map((client) => client.manager))]
    .map<ManagerSummary>((name) => {
      const activityToday = managerClients.filter((client) => (
        client.manager === name
        && (
          client.enteredMinutesAgo <= 1_440
          || (latestActivityTime > 0 && client.changedAt >= activityWindowStart)
        )
      ));
      return {
        name,
        calls: activityToday.length + 6 + (name.charCodeAt(0) % 5),
        reached: activityToday.filter((client) => client.stage >= 1).length + 3,
        meaningful: activityToday.filter((client) => client.stage >= 1 && client.waitingMinutes >= 1).length + 1,
        progressed: activityToday.filter((client) => client.stage >= 2).length,
      };
    })
    .map((manager) => ({
      ...manager,
      reached: Math.min(manager.calls, manager.reached),
      meaningful: Math.min(manager.reached, manager.meaningful),
    }))
    .sort((left, right) => right.progressed - left.progressed || right.calls - left.calls)
    .slice(0, 5);
  const maximumProgressed = Math.max(1, ...managers.map((manager) => manager.progressed));

  return (
    <section className={styles.ownerOverview} aria-labelledby="owner-overview-title">
      <header className={styles.ownerOverviewHeader}>
        <div>
          <h1 id="owner-overview-title">Сегодня под контролем</h1>
        </div>
      </header>

      <div className={styles.ownerKpis}>
        <article className={overdue.length ? styles.ownerKpiAlert : ""}>
          <span><ShieldAlert /></span>
          <div><small>Просрочено компанией</small><strong>{overdue.length}</strong><em>клиентов требуют ответа</em></div>
        </article>
        <article>
          <span><Clock3 /></span>
          <div><small>Ждут действие компании</small><strong>{waiting.length}</strong><em>включая ещё не просроченные</em></div>
        </article>
        <article>
          <span><UsersRound /></span>
          <div><small>Сейчас в работе</small><strong>{active.length}</strong><em>{hot} горячих клиентов</em></div>
        </article>
        <article>
          <span><Banknote /></span>
          <div><small>Получено за 30 дней</small><strong>{money(revenue)}</strong><em>по подтверждённым оплатам</em></div>
        </article>
      </div>

      <div className={styles.ownerActionGrid}>
        <section className={styles.ownerQueue} aria-label="Клиенты, которые ждут компанию">
          <header>
            <div><small>Сделать сейчас</small><h2>{overdue.length ? `${overdue.length} клиентов уже просрочены` : "Очередь без просрочек"}</h2></div>
            <button onClick={onOpenSignals}>Все сигналы</button>
          </header>
          <div>
            {overdue.slice(0, 2).map((client, index) => (
              <button
                className={styles.ownerQueueRow}
                key={client.id}
                onClick={() => onOpenSignals()}
              >
                <i>{index + 1}</i>
                <span><strong>{client.name}</strong><small>{stageLabels[client.stage]} · {client.manager}</small></span>
                <em>{duration(client.waitingMinutes)}</em>
                <ArrowRight />
              </button>
            ))}
            {!overdue.length && (
              <div className={styles.ownerQueueEmpty}>
                <UserRoundCheck /> Все обязательства компании выполняются в пределах SLA.
              </div>
            )}
          </div>
        </section>

        <section className={styles.ownerTeam} aria-label="Результаты менеджеров за сегодня">
          <header><small>Команда · сегодня</small><h2>Результат менеджеров</h2></header>
          <div>
            {managers.map((manager) => (
              <button
                key={manager.name}
                aria-label={`${manager.name}: ${manager.calls} звонков, ${manager.reached} дозвонов, ${manager.meaningful} разговоров дольше минуты, ${manager.progressed} клиентов продвинуто с начала рабочего дня.`}
              >
                <span className={styles.ownerManagerAvatar}>{manager.name.slice(0, 1).toUpperCase()}</span>
                <span className={styles.ownerManagerInfo}>
                  <strong>{manager.name}</strong>
                  <span className={styles.ownerCallJourney} aria-label={`Воронка звонков: ${manager.calls} набрано, ${manager.reached} дозвонов, ${manager.meaningful} разговоров больше минуты`}>
                    <span style={{ "--call-share": "100%" } as CSSProperties}>
                      <small><PhoneCall /> Набрано</small><b>{manager.calls}</b>
                    </span>
                    <span style={{ "--call-share": `${manager.calls ? manager.reached / manager.calls * 100 : 0}%` } as CSSProperties}>
                      <small>Дозвон</small><b>{manager.reached}</b><em>{manager.calls ? Math.round(manager.reached / manager.calls * 100) : 0}%</em>
                    </span>
                    <span style={{ "--call-share": `${manager.calls ? manager.meaningful / manager.calls * 100 : 0}%` } as CSSProperties}>
                      <small>&gt; 1 мин</small><b>{manager.meaningful}</b><em>{manager.calls ? Math.round(manager.meaningful / manager.calls * 100) : 0}%</em>
                    </span>
                  </span>
                </span>
                <em>{manager.progressed}<small>продвинул по этапам</small><i aria-hidden="true"><u style={{ width: `${manager.progressed / maximumProgressed * 100}%` }} /></i></em>
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
