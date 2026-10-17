"use client";

import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Sparkles,
  TrendingUp,
  UserRoundCheck,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import styles from "@/app/demo/sales-copilot/pulse.module.css";
import type { ClientThread } from "@/components/daily-flow-map";

type ReportPeriod = "day" | "week" | "month";

type OwnerReportsProps = {
  clients: ClientThread[];
  updatedAt: string;
};

const reportPeriods: Array<{ id: ReportPeriod; label: string; minutes: number }> = [
  { id: "day", label: "Сегодня", minutes: 1_440 },
  { id: "week", label: "7 дней", minutes: 10_080 },
  { id: "month", label: "30 дней", minutes: 43_200 },
];

const productLabels = {
  windows: "Окна",
  doors: "Двери",
  balconies: "Балконы",
} as const;

const money = (value: number) => `${Math.round(value).toLocaleString("ru-RU")} ₸`;

const duration = (minutes: number) => {
  if (minutes >= 1_440) return `${(minutes / 1_440).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} д`;
  if (minutes >= 60) return `${(minutes / 60).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} ч`;
  return `${minutes} мин`;
};

const wasActiveWithin = (client: ClientThread, minutes: number, now: number) => {
  if (client.changedAt > 0) return now - client.changedAt <= minutes * 60_000;
  return client.enteredMinutesAgo <= minutes;
};

export function OwnerReports({ clients, updatedAt }: OwnerReportsProps) {
  const [period, setPeriod] = useState<ReportPeriod>("day");
  const [reportNow] = useState(() => Date.now());
  const selectedPeriod = reportPeriods.find((item) => item.id === period) ?? reportPeriods[0];

  const report = useMemo(() => {
    const touched = clients.filter((client) => wasActiveWithin(client, selectedPeriod.minutes, reportNow));
    const newClients = clients.filter((client) => client.enteredMinutesAgo <= selectedPeriod.minutes);
    const payments = touched.filter((client) => client.stage === 6 && client.value > 0);
    const revenue = payments.reduce((sum, client) => sum + client.value, 0);
    const paidClients = clients.filter((client) => client.stage === 6 && client.value > 0);
    const averageCheck = paidClients.length
      ? paidClients.reduce((sum, client) => sum + client.value, 0) / paidClients.length
      : 0;
    const estimatedDealValue = averageCheck || 680_000;
    const activePipeline = clients
      .filter((client) => client.stage >= 2 && client.stage < 6)
      .reduce((sum, client) => sum + (client.value || estimatedDealValue), 0);
    const overdue = clients.filter((client) => client.waitingForBusiness);
    const risk = overdue.reduce((sum, client) => sum + (client.value || averageCheck), 0);
    const target = period === "day" ? 5_500_000 : period === "week" ? 26_000_000 : 96_000_000;
    const planProgress = Math.min(100, target ? Math.round((revenue / target) * 100) : 0);

    const managerNames = Array.from(new Set(
      clients.map((client) => client.manager).filter((manager) => manager && manager !== "Не назначен"),
    ));
    const managers = managerNames.map((name) => {
      const assigned = clients.filter((client) => client.manager === name);
      const periodClients = assigned.filter((client) => wasActiveWithin(client, selectedPeriod.minutes, reportNow));
      const managerPayments = periodClients.filter((client) => client.stage === 6 && client.value > 0);
      const managerOverdue = assigned.filter((client) => client.waitingForBusiness);
      const managerRevenue = managerPayments.reduce((sum, client) => sum + client.value, 0);
      const active = assigned.filter((client) => client.stage < 6).length;
      const waitingClients = assigned.filter((client) => client.waitingForBusiness);
      const averageWait = waitingClients.length
        ? Math.round(waitingClients.reduce((sum, client) => sum + client.waitingMinutes, 0) / waitingClients.length)
        : 0;
      const conversion = assigned.length ? Math.round((assigned.filter((client) => client.stage === 6).length / assigned.length) * 100) : 0;
      return {
        name,
        active,
        newClients: assigned.filter((client) => client.enteredMinutesAgo <= selectedPeriod.minutes).length,
        overdue: managerOverdue.length,
        revenue: managerRevenue,
        averageWait,
        conversion,
      };
    }).sort((a, b) => b.revenue - a.revenue || a.overdue - b.overdue);

    const products = (Object.keys(productLabels) as Array<keyof typeof productLabels>).map((id) => {
      const productClients = clients.filter((client) => client.product === id);
      const productPayments = productClients.filter(
        (client) => client.stage === 6 && client.value > 0 && wasActiveWithin(client, selectedPeriod.minutes, reportNow),
      );
      return {
        id,
        label: productLabels[id],
        revenue: productPayments.reduce((sum, client) => sum + client.value, 0),
        pipeline: productClients
          .filter((client) => client.stage >= 2 && client.stage < 6)
          .reduce((sum, client) => sum + (client.value || estimatedDealValue), 0),
        active: productClients.filter((client) => client.stage < 6).length,
      };
    });

    return { touched, newClients, payments, revenue, activePipeline, overdue, risk, target, planProgress, managers, products };
  }, [clients, period, reportNow, selectedPeriod.minutes]);

  const maxProductAmount = Math.max(...report.products.map((item) => item.revenue + item.pipeline), 1);
  const topManager = report.managers[0];
  const attentionManager = [...report.managers].sort((a, b) => b.overdue - a.overdue)[0];
  const reportDate = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Qyzylorda",
  }).format(new Date());

  return (
    <main className={`${styles.secondaryView} ${styles.reportsView}`}>
      <header className={styles.reportsHeader}>
        <div>
          <span><BarChart3 /> Управленческий отчёт</span>
          <h1>Люди и деньги</h1>
          <p>{reportDate} · показатели рассчитаны по тем же процессам, что видны на карте бизнеса.</p>
        </div>
        <div className={styles.reportsLive}><i /><span><strong>Данные актуальны</strong><small>обновлено {updatedAt}</small></span></div>
      </header>

      <div className={styles.reportPeriod} role="group" aria-label="Период отчёта">
        <span><CalendarDays /> Период</span>
        {reportPeriods.map((item) => (
          <button
            key={item.id}
            className={period === item.id ? styles.reportPeriodActive : ""}
            onClick={() => setPeriod(item.id)}
            aria-pressed={period === item.id}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className={styles.reportKpis} aria-label="Главные показатели отчёта">
        <article><span><UserRoundCheck /></span><div><small>Новых клиентов</small><strong>{report.newClients.length}</strong><em>{report.touched.length} процессов менялись</em></div></article>
        <article><span><Banknote /></span><div><small>Получено</small><strong>{money(report.revenue)}</strong><em>{report.payments.length} подтверждённых оплат</em></div></article>
        <article><span><TrendingUp /></span><div><small>План периода</small><strong>{report.planProgress}%</strong><em>{money(report.target)} цель</em></div><i><b style={{ width: `${report.planProgress}%` }} /></i></article>
        <article className={report.overdue.length ? styles.reportKpiAlert : ""}><span><AlertTriangle /></span><div><small>Просрочено компанией</small><strong>{report.overdue.length}</strong><em>{money(report.risk)} под риском</em></div></article>
      </section>

      <section className={styles.reportPanel}>
        <header><div><small>Команда</small><h2>Ежедневный отчёт по сотрудникам</h2></div><span>Сортировка по результату и риску</span></header>
        <div className={styles.employeeReportHead}><span>Сотрудник</span><span>Новые</span><span>В работе</span><span>Ждут компанию</span><span>Среднее ожидание</span><span>Оплачено</span><span>Статус</span></div>
        <div className={styles.employeeReportRows}>
          {report.managers.map((manager) => {
            const status = manager.overdue >= 2 ? "Нужен контроль" : manager.overdue === 1 ? "Есть риск" : "В норме";
            return (
              <article key={manager.name}>
                <div className={styles.employeeIdentity}><span>{manager.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><strong>{manager.name}</strong><small>конверсия {manager.conversion}%</small></div></div>
                <b>{manager.newClients}</b>
                <b>{manager.active}</b>
                <b className={manager.overdue ? styles.employeeOverdue : ""}>{manager.overdue}</b>
                <div className={styles.employeeWait}><strong>{duration(manager.averageWait)}</strong><i><b style={{ width: `${Math.min(100, (manager.averageWait / 120) * 100)}%` }} /></i></div>
                <strong className={styles.employeeMoney}>{money(manager.revenue)}</strong>
                <span className={manager.overdue >= 2 ? styles.employeeStatusAlert : manager.overdue === 1 ? styles.employeeStatusWarning : styles.employeeStatusGood}>{status}</span>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.reportBottomGrid}>
        <article className={styles.moneyReport}>
          <header><div><small>Деньги</small><h2>Выручка и деньги в работе</h2></div><WalletCards /></header>
          <div className={styles.moneyOverview}><span><small>В активных сделках</small><strong>{money(report.activePipeline)}</strong></span><span><small>Под риском</small><strong>{money(report.risk)}</strong></span></div>
          <div className={styles.productMoneyList}>
            {report.products.map((product) => (
              <div key={product.id}>
                <header><strong>{product.label}</strong><span>{product.active} в работе</span><b>{money(product.revenue)}</b></header>
                <i><b style={{ width: `${Math.max(4, ((product.revenue + product.pipeline) / maxProductAmount) * 100)}%` }} /></i>
                <small>{money(product.pipeline)} в активных КП и договорах</small>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.reportAiSummary}>
          <header><span><Sparkles /></span><div><small>Наблюдение AI</small><h2>Что важно владельцу сегодня</h2></div></header>
          <p>{report.overdue.length > 0
            ? `${report.overdue.length} процессов ждут действие компании. Наибольшая очередь у ${attentionManager?.name ?? "команды"} — ${attentionManager?.overdue ?? 0}.`
            : "Просроченных обязательств компании нет. Команда удерживает текущую очередь в срок."}</p>
          <div><CheckCircle2 /><span><strong>Лучший результат периода</strong><small>{topManager?.name ?? "Команда"}: {money(topManager?.revenue ?? 0)} получено, {topManager?.active ?? 0} процессов в работе.</small></span></div>
          <div><Clock3 /><span><strong>Рекомендация на сегодня</strong><small>Сначала закрыть ожидающих компанию, затем вернуть горячие сделки к следующему этапу.</small></span></div>
        </article>
      </section>
    </main>
  );
}
