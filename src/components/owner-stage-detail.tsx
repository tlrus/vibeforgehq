"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gauge,
  MessageSquareText,
  Target,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import type { ClientThread } from "@/components/daily-flow-map";
import styles from "@/components/owner-stage-detail.module.css";

const stageNames = ["Заявка", "Диалог", "КП", "Договор", "Исполнение", "Принято", "Оплачено"];
const productNames = { windows: "Окна", doors: "Двери", balconies: "Балконы" } as const;

type Metric = {
  label: string;
  value: string;
  unit: string;
  caption: string;
  progress: number;
  tone: "normal" | "warning" | "success";
  matches: (client: ClientThread) => boolean;
};

function compactMoney(value: number) {
  if (value >= 1_000_000) return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value / 1_000_000)} млн ₸`;
  return `${new Intl.NumberFormat("ru-RU").format(Math.round(value / 1_000))} тыс. ₸`;
}

function waitTime(minutes: number) {
  if (minutes < 60) return `${minutes} мин`;
  if (minutes < 1_440) return `${Math.round(minutes / 6) / 10} ч`;
  return `${Math.round(minutes / 144) / 10} дня`;
}

function buildMetrics(stage: number, current: ClientThread[], reached: ClientThread[]): Metric[] {
  const onStage = (client: ClientThread) => client.stage === stage;
  const waiting = current.filter((client) => client.nextActionOwner === "business");
  const overdue = current.filter((client) => client.waitingForBusiness);
  const qualified = current.filter((client) => client.needDetected);
  const hot = current.filter((client) => client.temperature === "hot");
  const nextReached = reached.filter((client) => client.stage > stage).length;
  const conversion = reached.length ? Math.round(nextReached / reached.length * 100) : 0;
  const totalValue = current.reduce((sum, client) => sum + client.value, 0);
  const averageValue = current.length ? totalValue / current.length : 0;

  const common: Metric = {
    label: "Клиенты на этапе",
    value: String(current.length),
    unit: "сделок",
    caption: "Откройте список и перейдите в конкретную сделку",
    progress: Math.min(100, current.length * 8),
    tone: "normal",
    matches: onStage,
  };
  const next: Metric = {
    label: "Перешли дальше",
    value: `${conversion}%`,
    unit: `${nextReached} клиентов`,
    caption: `Конверсия из этапа «${stageNames[stage]}»`,
    progress: conversion,
    tone: conversion >= 65 ? "success" : conversion >= 40 ? "normal" : "warning",
    matches: (client) => client.stage > stage,
  };

  if (stage === 0) return [
    { label: "Не получили ответ", value: String(waiting.length), unit: "заявок", caption: "Компания должна ответить первой", progress: Math.min(100, waiting.length * 22), tone: waiting.length ? "warning" : "success", matches: (client) => onStage(client) && client.nextActionOwner === "business" },
    { label: "Просрочен первый ответ", value: String(overdue.length), unit: "клиентов", caption: "SLA первого ответа — 10 минут", progress: Math.min(100, overdue.length * 34), tone: overdue.length ? "warning" : "success", matches: (client) => onStage(client) && client.waitingForBusiness },
    common,
  ];
  if (stage === 1) return [
    { label: "Не квалифицированы", value: String(current.length - qualified.length), unit: "диалогов", caption: "Не хватает задачи, параметров или срока", progress: current.length ? Math.round((current.length - qualified.length) / current.length * 100) : 0, tone: current.length - qualified.length ? "warning" : "success", matches: (client) => onStage(client) && !client.needDetected },
    { label: "Ждут менеджера", value: String(waiting.length), unit: "клиентов", caption: "Следующее сообщение должна отправить компания", progress: Math.min(100, waiting.length * 20), tone: waiting.length ? "warning" : "success", matches: (client) => onStage(client) && client.nextActionOwner === "business" },
    { label: "Горячие лиды", value: String(hot.length), unit: "клиентов", caption: "Их нужно вывести в КП в первую очередь", progress: current.length ? Math.round(hot.length / current.length * 100) : 0, tone: hot.length ? "success" : "normal", matches: (client) => onStage(client) && client.temperature === "hot" },
  ];
  if (stage === 2) return [
    { label: "КП просрочено", value: String(overdue.length), unit: "документов", caption: "Обещанное КП не отправлено вовремя", progress: Math.min(100, overdue.length * 30), tone: overdue.length ? "warning" : "success", matches: (client) => onStage(client) && client.waitingForBusiness },
    { label: "Сумма активных КП", value: compactMoney(totalValue), unit: "в работе", caption: "Потенциальная выручка на текущем этапе", progress: Math.min(100, totalValue / 80_000), tone: "normal", matches: onStage },
    next,
  ];
  if (stage === 3) return [
    { label: "Требуют правок", value: String(waiting.length), unit: "договоров", caption: "Клиент ждёт новую редакцию или реквизиты", progress: Math.min(100, waiting.length * 28), tone: waiting.length ? "warning" : "success", matches: (client) => onStage(client) && client.nextActionOwner === "business" },
    { label: "Сумма договоров", value: compactMoney(totalValue), unit: "на согласовании", caption: "Деньги, которые ближе всего к запуску", progress: Math.min(100, totalValue / 70_000), tone: "normal", matches: onStage },
    next,
  ];
  if (stage === 4) return [
    { label: "Нарушен срок", value: String(overdue.length), unit: "заказов", caption: "Нет обещанного статуса или работа задержана", progress: Math.min(100, overdue.length * 30), tone: overdue.length ? "warning" : "success", matches: (client) => onStage(client) && client.waitingForBusiness },
    { label: "В исполнении", value: String(current.length), unit: "заказов", caption: `Средняя стоимость ${compactMoney(averageValue)}`, progress: Math.min(100, current.length * 10), tone: "normal", matches: onStage },
    next,
  ];
  if (stage === 5) return [
    { label: "Ждут закрытия", value: String(waiting.length), unit: "заказов", caption: "Нужно закрыть замечания или запросить оплату", progress: Math.min(100, waiting.length * 30), tone: waiting.length ? "warning" : "success", matches: (client) => onStage(client) && client.nextActionOwner === "business" },
    { label: "Готово к оплате", value: compactMoney(totalValue), unit: "ожидается", caption: "Принятые работы, по которым ещё нет оплаты", progress: Math.min(100, totalValue / 60_000), tone: "success", matches: onStage },
    next,
  ];
  return [
    { label: "Получено", value: compactMoney(totalValue), unit: "оплачено", caption: "Подтверждённые деньги на этом этапе", progress: 100, tone: "success", matches: onStage },
    { label: "Средний чек", value: compactMoney(averageValue), unit: "на сделку", caption: "Среднее по закрытым сделкам", progress: Math.min(100, averageValue / 9_000), tone: "normal", matches: onStage },
    common,
  ];
}

export function OwnerStageDetail({
  clients,
  stage,
  onBack,
  onOpenClient,
}: {
  clients: ClientThread[];
  stage: number;
  onBack: () => void;
  onOpenClient: (client: ClientThread) => void;
}) {
  const [selectedClient, setSelectedClient] = useState<ClientThread | null>(null);
  const businessClients = clients.filter((client) => !client.isDemo);
  const current = businessClients.filter((client) => client.stage === stage);
  const reached = businessClients.filter((client) => client.stage >= stage);
  const metrics = buildMetrics(stage, current, reached);
  const problemCount = current.filter((client) => client.waitingForBusiness || client.nextActionOwner === "business").length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button type="button" onClick={onBack}><ArrowLeft /> Пульс</button>
        <div>
          <span>ЭТАП {String(stage + 1).padStart(2, "0")}</span>
          <h1>{stageNames[stage]}</h1>
          <p>{current.length} клиентов сейчас · {problemCount} требуют действия компании</p>
        </div>
        <aside><UsersRound /><span><small>Дошли до этапа</small><strong>{reached.length}</strong></span></aside>
      </header>

      <section className={styles.metricGrid} aria-label={`Показатели этапа ${stageNames[stage]}`}>
        {metrics.map((metric, index) => {
          const visibleDeals = businessClients.filter(metric.matches).slice(0, 12);
          const Icon = index === 0 ? AlertTriangle : index === 1 ? Clock3 : Target;
          return (
            <details className={styles.metric} data-tone={metric.tone} key={metric.label} open={index === 0 && metric.tone === "warning"}>
              <summary>
                <i><Icon /></i>
                <span><small>{metric.label}</small><strong>{metric.value}</strong><em>{metric.unit}</em></span>
                <b><ArrowRight /></b>
                <div><span style={{ width: `${Math.max(4, Math.min(100, metric.progress))}%` }} /></div>
              </summary>
              <section>
                <header><span><MessageSquareText /> {metric.caption}</span><small>{visibleDeals.length} сделок в списке</small></header>
                {visibleDeals.length ? visibleDeals.map((client) => (
                  <button type="button" key={`${metric.label}-${client.id}`} onClick={() => setSelectedClient(client)}>
                    <span><strong>{client.name}</strong><small>{client.id} · {productNames[client.product]} · {client.manager}</small></span>
                    <em>{client.waitingForBusiness ? `просрочено ${waitTime(client.waitingMinutes)}` : `на этапе ${waitTime(client.waitingMinutes)}`}</em>
                    <ArrowRight />
                  </button>
                )) : (
                  <p className={styles.empty}><CheckCircle2 /> Проблемных сделок по этому показателю нет.</p>
                )}
              </section>
            </details>
          );
        })}
      </section>

      {selectedClient && (
        <aside className={styles.dealSheet} aria-label={`Сделка ${selectedClient.name}`}>
          <header>
            <span><small>{selectedClient.id} · {stageNames[selectedClient.stage]}</small><strong>{selectedClient.name}</strong></span>
            <button type="button" onClick={() => setSelectedClient(null)} aria-label="Закрыть карточку сделки"><X /></button>
          </header>
          <dl>
            <div><dt>Менеджер</dt><dd>{selectedClient.manager}</dd></div>
            <div><dt>Продукт</dt><dd>{productNames[selectedClient.product]}</dd></div>
            <div><dt>Сумма</dt><dd>{selectedClient.value ? compactMoney(selectedClient.value) : "Уточняется"}</dd></div>
            <div><dt>Ждёт</dt><dd>{selectedClient.nextActionOwner === "business" ? "Компанию" : selectedClient.nextActionOwner === "client" ? "Клиента" : "Закрыто"}</dd></div>
            <div className={styles.dealSheetWide}><dt>Запрос клиента</dt><dd>{selectedClient.needSummary || selectedClient.painSummary}</dd></div>
          </dl>
          <div className={styles.dealSheetStatus} data-overdue={selectedClient.waitingForBusiness}>
            {selectedClient.waitingForBusiness ? `Просрочено компанией на ${waitTime(selectedClient.waitingMinutes)}` : `На этапе ${waitTime(selectedClient.waitingMinutes)}`}
          </div>
          {!selectedClient.id.startsWith("HIST-") && (
            <button className={styles.dealSheetAction} type="button" onClick={() => onOpenClient(selectedClient)}>
              Открыть переписку и карточку <ArrowRight />
            </button>
          )}
        </aside>
      )}

      <footer className={styles.footer}><Gauge /> Нажмите на любой показатель, чтобы увидеть сделки, которые формируют эту цифру.</footer>
    </main>
  );
}
