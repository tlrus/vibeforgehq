"use client";

import {
  ArrowLeft,
  Bot,
  CheckCheck,
  Clock3,
  MessageCircleMore,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import styles from "@/app/demo/sales-copilot/pulse.module.css";
import type { ClientThread } from "@/components/daily-flow-map";
import { demoBranchNames, demoProductNames, getDemoDialogueInsight } from "@/lib/pilot-demo-data";

export type OwnerConversationMessage = {
  id: string;
  sender: "client" | "manager" | "ai" | "system";
  text: string;
  messageType: string;
  deliveryStatus: string | null;
  createdAt: string;
};

export type OwnerConversation = {
  processId: string;
  leadId: string;
  customerName: string;
  phone: string;
  managerName: string;
  stage: string;
  productName: string;
  locationName: string;
  waitingFor: "business" | "customer" | null;
  waitingSince: string | null;
  updatedAt: string;
  messages: OwnerConversationMessage[];
};

const stageLabels: Record<string, string> = {
  LEAD: "Заявка",
  DIALOG: "Диалог",
  QUOTE: "КП",
  CONTRACT: "Договор",
  FULFILLMENT: "Исполнение",
  ACCEPTED: "Принято",
  PAYMENT: "Оплачено",
};

const conversationStageCodes = ["LEAD", "DIALOG", "QUOTE", "CONTRACT", "FULFILLMENT", "ACCEPTED", "PAYMENT"];

function makeDemoConversations(clients: ClientThread[]): OwnerConversation[] {
  return clients.map((client, index) => {
    const now = Date.now() - index * 11 * 60_000;
    const insight = getDemoDialogueInsight(client);
    const productName = demoProductNames[client.product];
    const stageQuestion = [
      `Подскажите ориентировочную стоимость на ${productName.toLocaleLowerCase("ru-RU")} и когда можно сделать замер?`,
      `Размеры примерно такие: ${insight.dimensions}. ${insight.timeline}. Что ещё нужно для точного расчёта?`,
      `Посмотрел КП. ${insight.objection}. Пришлите, пожалуйста, уточнённый вариант.`,
      `В договоре нужно уточнить один пункт: ${insight.objection}. Когда сможете исправить?`,
      `Подскажите статус заказа. ${insight.timeline}. Всё идёт по графику?`,
      "Работу посмотрел. Пришлите, пожалуйста, итоговый акт и сумму к оплате.",
      "Оплату отправил. Спасибо, всё получил.",
    ][client.stage];
    const managerStep = [
      "Здравствуйте! Уточните, пожалуйста, примерные размеры, адрес и что для вас важнее — цена, срок или теплоизоляция.",
      `Зафиксировал параметры: ${insight.dimensions}. Подготовлю расчёт и вернусь с вариантами сегодня.`,
      `Отправил обновлённое КП. В нём указаны комплектация, монтаж, гарантия и срок. Итог: ${insight.budget}.`,
      "Правку внёс, договор отправил повторно. Проверьте срок и порядок оплаты в разделе 3.",
      "Проверил производство: заказ в графике. Монтажная бригада подтверждена, перед выездом позвоним.",
      "Акт и итоговый расчёт отправил. После подтверждения можно закрыть оплату.",
      "Оплата поступила, заказ закрыт. Гарантийные документы сохранены в карточке.",
    ][client.stage];
    const messages: OwnerConversationMessage[] = [
      { id: `${client.id}-1`, sender: "client", text: `Здравствуйте. Пишу по ${productName.toLocaleLowerCase("ru-RU")} из рекламы.`, messageType: "TEXT", deliveryStatus: "received", createdAt: new Date(now - 52 * 60_000).toISOString() },
      { id: `${client.id}-2`, sender: "manager", text: "Здравствуйте! Я помогу подобрать решение. Расскажите, что хотите изменить и какой результат ожидаете?", messageType: "TEXT", deliveryStatus: "sent", createdAt: new Date(now - 47 * 60_000).toISOString() },
      { id: `${client.id}-3`, sender: "client", text: `${client.needSummary}. Основная причина: ${client.painSummary.toLocaleLowerCase("ru-RU")}.`, messageType: "TEXT", deliveryStatus: "received", createdAt: new Date(now - 39 * 60_000).toISOString() },
      { id: `${client.id}-4`, sender: "manager", text: client.stage === 0 ? managerStep : `Понял. Уточню параметры и зафиксирую следующий шаг. ${insight.decisionCriteria} — правильно?`, messageType: "TEXT", deliveryStatus: "sent", createdAt: new Date(now - 34 * 60_000).toISOString() },
      { id: `${client.id}-5`, sender: "client", text: stageQuestion, messageType: "TEXT", deliveryStatus: "received", createdAt: new Date(now - Math.max(3, client.waitingMinutes) * 60_000).toISOString() },
      { id: `${client.id}-ai`, sender: "ai", text: `Резюме: ${insight.summary}\nНамерение: ${insight.intent}.\nБюджет: ${insight.budget}. Срок: ${insight.timeline}.\nРиск/возражение: ${insight.objection}.\nСледующий шаг: ${insight.nextStep}. Уверенность анализа: ${insight.confidence}%.`, messageType: "PRIVATE_NOTE", deliveryStatus: null, createdAt: new Date(now - Math.max(2, client.waitingMinutes - 1) * 60_000).toISOString() },
    ];
    if (client.nextActionOwner === "client") {
      messages.push({ id: `${client.id}-6`, sender: "manager", text: managerStep, messageType: "TEXT", deliveryStatus: "sent", createdAt: new Date(now).toISOString() });
    } else if (client.nextActionOwner === "none") {
      messages.push({ id: `${client.id}-6`, sender: "manager", text: managerStep, messageType: "TEXT", deliveryStatus: "read", createdAt: new Date(now - 4 * 60_000).toISOString() });
      messages.push({ id: `${client.id}-7`, sender: "system", text: "Сделка завершена: оплата подтверждена, обязательства компании закрыты.", messageType: "EVENT", deliveryStatus: null, createdAt: new Date(now).toISOString() });
    }
    return {
      processId: client.id,
      leadId: client.id,
      customerName: client.name,
      phone: client.phoneMasked,
      managerName: client.manager,
      stage: conversationStageCodes[client.stage],
      productName,
      locationName: demoBranchNames[client.branch],
      waitingFor: client.nextActionOwner === "business" ? "business" : client.nextActionOwner === "client" ? "customer" : null,
      waitingSince: new Date(now - client.waitingMinutes * 60_000).toISOString(),
      updatedAt: new Date(now).toISOString(),
      messages,
    };
  });
}

function time(value: string) {
  return new Date(value).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function day(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return time(value);
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

function waitingDuration(value: string | null) {
  if (!value) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} мин`;
  return `${Math.round(minutes / 6) / 10} ч`;
}

export function OwnerConversations({
  liveMode,
  clients,
  requestedManager,
  requestedProcessId,
  onBack,
}: {
  liveMode: boolean;
  clients: ClientThread[];
  requestedManager: string | null;
  requestedProcessId: string | null;
  onBack: () => void;
}) {
  const [storedConversations, setStoredConversations] = useState<OwnerConversation[]>([]);
  const demoConversations = useMemo(() => makeDemoConversations(clients), [clients]);
  const conversations = useMemo(() => {
    const storedById = new Map(storedConversations.map((item) => [item.processId, item]));
    const merged = demoConversations.map((demo) => {
      const stored = storedById.get(demo.processId);
      if (!stored) return demo;
      storedById.delete(demo.processId);
      return { ...demo, ...stored, messages: stored.messages.length ? stored.messages : demo.messages };
    });
    return [...storedById.values(), ...merged];
  }, [demoConversations, storedConversations]);
  const [manager, setManager] = useState(requestedManager ?? "all");
  const [selectedId, setSelectedId] = useState<string | null>(requestedProcessId ?? clients[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(liveMode);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!liveMode) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch("/api/pilot/conversations", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (response.status === 403) throw new Error("Общий архив доступен только владельцу.");
        if (!response.ok) throw new Error("Не удалось загрузить переписки WhatsApp.");
        const body = await response.json() as { conversations: OwnerConversation[] };
        if (cancelled) return;
        setStoredConversations(body.conversations);
        setError("");
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Не удалось загрузить переписки.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [liveMode]);

  const managers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const conversation of conversations) {
      counts.set(conversation.managerName, (counts.get(conversation.managerName) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [conversations]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru-RU");
    return conversations
      .filter((conversation) => manager === "all" || conversation.managerName === manager)
      .filter((conversation) => !normalized || [conversation.customerName, conversation.phone, conversation.managerName, conversation.productName]
        .some((value) => value.toLocaleLowerCase("ru-RU").includes(normalized)))
      .sort((left, right) => {
        if (left.waitingFor === "business" && right.waitingFor !== "business") return -1;
        if (right.waitingFor === "business" && left.waitingFor !== "business") return 1;
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });
  }, [conversations, manager, query]);

  const effectiveSelectedId = selectedId && visible.some((conversation) => conversation.processId === selectedId)
    ? selectedId
    : visible[0]?.processId ?? null;
  const selected = conversations.find((conversation) => conversation.processId === effectiveSelectedId) ?? null;

  return (
    <main className={`${styles.secondaryView} ${styles.conversationsView}`}>
      <header className={styles.conversationsHeader}>
        <div>
          <span><MessageCircleMore /> WhatsApp компании</span>
          <h1>Переписки команды</h1>
          <p>Выберите менеджера, затем клиента. Здесь виден полный диалог и текущая ответственность.</p>
        </div>
        <div className={styles.conversationsAccess}><ShieldCheck /><span><strong>Доступ владельца</strong><small>Общий архив закрыт для менеджерской роли</small></span></div>
      </header>

      <section className={styles.conversationManagers} aria-label="Фильтр по менеджеру">
        <button className={manager === "all" ? styles.conversationManagerActive : ""} onClick={() => setManager("all")}>
          <span><UsersRound /></span><div><strong>Все менеджеры</strong><small>Вся команда</small></div><b>{conversations.length}</b>
        </button>
        {managers.map(([name, count]) => (
          <button className={manager === name ? styles.conversationManagerActive : ""} key={name} onClick={() => setManager(name)}>
            <span>{name.slice(0, 1).toUpperCase()}</span><div><strong>{name}</strong><small>{conversations.filter((item) => item.managerName === name && item.waitingFor === "business").length} ждут ответа</small></div><b>{count}</b>
          </button>
        ))}
      </section>

      <section className={styles.conversationWorkspace}>
        <aside className={styles.conversationList}>
          <header>
            <button onClick={onBack} aria-label="Вернуться к пульсу"><ArrowLeft /></button>
            <div><strong>{manager === "all" ? "Все диалоги" : manager}</strong><small>{visible.length} переписок</small></div>
            {loading && <RefreshCw className={styles.conversationRefresh} />}
          </header>
          <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Клиент, номер или продукт" /></label>
          <div className={styles.conversationListRows}>
            {visible.map((conversation) => {
              const last = [...conversation.messages].reverse().find((message) => message.sender === "client" || message.sender === "manager") ?? conversation.messages.at(-1);
              return (
                <button className={effectiveSelectedId === conversation.processId ? styles.conversationRowActive : ""} key={conversation.processId} onClick={() => setSelectedId(conversation.processId)}>
                  <span className={styles.conversationAvatar}>{conversation.customerName.slice(0, 1).toUpperCase()}</span>
                  <span><strong>{conversation.customerName}</strong><small>{last?.text || "Сообщений пока нет"}</small><em>{conversation.managerName} · {stageLabels[conversation.stage] || conversation.stage}</em></span>
                  <time>{last ? day(last.createdAt) : day(conversation.updatedAt)}</time>
                  {conversation.waitingFor === "business" && <i title="Клиент ждёт компанию" />}
                </button>
              );
            })}
            {!visible.length && <p className={styles.conversationEmpty}>По этому фильтру переписок нет.</p>}
          </div>
        </aside>

        <article className={styles.conversationThread}>
          {error ? (
            <div className={styles.conversationError}><ShieldCheck /><h2>Переписки недоступны</h2><p>{error}</p><button onClick={onBack}>Вернуться к пульсу</button></div>
          ) : selected ? (
            <>
              <header>
                <span className={styles.conversationAvatar}>{selected.customerName.slice(0, 1).toUpperCase()}</span>
                <div><strong>{selected.customerName}</strong><small>{selected.phone} · {selected.productName}</small></div>
                <span className={selected.waitingFor === "business" ? styles.conversationWaiting : styles.conversationAnswered}>
                  {selected.waitingFor === "business" ? <Clock3 /> : <CheckCheck />}
                  <span><strong>{selected.waitingFor === "business" ? "Ждёт компанию" : "Компания ответила"}</strong><small>{selected.waitingFor === "business" ? waitingDuration(selected.waitingSince) : stageLabels[selected.stage] || selected.stage}</small></span>
                </span>
              </header>
              <div className={styles.conversationContext}>
                <span><small>Менеджер</small><strong>{selected.managerName}</strong></span>
                <span><small>Этап</small><strong>{stageLabels[selected.stage] || selected.stage}</strong></span>
                <span><small>Точка</small><strong>{selected.locationName}</strong></span>
                <a href={`${liveMode ? "/pilot/crm" : "/demo/sales-copilot/crm"}/${encodeURIComponent(selected.processId)}`}>Карточка клиента →</a>
              </div>
              <div className={styles.conversationMessages} aria-live="polite">
                {selected.messages.map((message) => (
                  <div className={`${styles.conversationMessage} ${styles[`conversationMessage_${message.sender}`]}`} key={message.id}>
                    <span>{message.sender === "client" ? <UserRound /> : message.sender === "ai" ? <Bot /> : <MessageCircleMore />}</span>
                    <div><small>{message.sender === "client" ? selected.customerName : message.sender === "manager" ? selected.managerName : message.sender === "ai" ? "AI-суфлёр · приватная заметка" : "Система"}</small><p>{message.text}</p><time>{time(message.createdAt)} {message.deliveryStatus === "sent" ? "✓✓" : ""}</time></div>
                  </div>
                ))}
                {!selected.messages.length && <p className={styles.conversationEmpty}>Сообщения появятся после первого контакта в WhatsApp.</p>}
              </div>
            </>
          ) : (
            <div className={styles.conversationError}><MessageCircleMore /><h2>Выберите клиента</h2><p>Справа откроется полный WhatsApp-диалог.</p></div>
          )}
        </article>
      </section>
    </main>
  );
}
