"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Banknote,
  BellRing,
  Bot,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FileSignature,
  History,
  Images,
  Instagram,
  LockKeyhole,
  MessageCircle,
  MessageSquareText,
  PackageCheck,
  Send,
  Sparkles,
  ShieldCheck,
  Undo2,
  UserCog,
  UserRound,
  Video,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/demo/sales-copilot/pulse.module.css";
import { DailyFlowMap, dailyCreatives, networkBranches, productOptionsBySource, type BranchId, type ClientSource, type ClientThread, type CreativeId, type NextActionOwner } from "@/components/daily-flow-map";
import { OwnerCommandCenter } from "@/components/owner-command-center";
import { OwnerConversations } from "@/components/owner-conversations";
import { OwnerAiControl } from "@/components/owner-ai-control";
import { OwnerLiveOverview } from "@/components/owner-live-overview";
import { OwnerReports } from "@/components/owner-reports";
import { OwnerStageDetail } from "@/components/owner-stage-detail";
import { buildPilotDemoClients } from "@/lib/pilot-demo-data";
import { getPulseClientIdentity } from "@/lib/pulse-client";

type View = "pulse" | "ai-control" | "conversations" | "history" | "reports" | "route" | "signals" | "telegram" | "stage-detail";
type Tone = "normal" | "warning" | "success";
type LiveEvent = {
  id: number;
  time: string;
  source: string;
  action: string;
  stage: number;
  from: number | null;
  direction: "entry" | "forward" | "backward";
  tone: Tone;
  creativeId?: CreativeId;
  sourceId?: ClientSource;
  branchId?: BranchId;
  nextActionOwner?: NextActionOwner;
};

const stages = [
  { label: "Заявка", short: "Новый сигнал", icon: MessageCircle },
  { label: "Диалог", short: "Ответ менеджера", icon: MessageSquareText },
  { label: "КП", short: "Потребность ясна", icon: FileCheck2 },
  { label: "Договор", short: "Юридический этап", icon: FileSignature },
  { label: "Исполнение", short: "Отчёт сотрудника", icon: Wrench },
  { label: "Принято", short: "Услуга завершена", icon: PackageCheck },
  { label: "Оплачено", short: "Деньги поступили", icon: Banknote },
];

const eventTemplates: Omit<LiveEvent, "id" | "time">[] = [
  { source: "Reels · Тепло без переплат", action: "Новый человек → заявка из Instagram", creativeId: "reels", sourceId: "reels", from: null, stage: 0, direction: "entry", tone: "success", nextActionOwner: "business" },
  { source: "Карусель · До/после", action: "Новый человек → заявка из WhatsApp", creativeId: "carousel", sourceId: "carousel", from: null, stage: 0, direction: "entry", tone: "success", nextActionOwner: "business" },
  { source: "Stories · Расчёт за минуту", action: "Новый человек → заявка из лид-формы", creativeId: "stories", sourceId: "stories", from: null, stage: 0, direction: "entry", tone: "success", nextActionOwner: "business" },
  { source: "WhatsApp", action: "Новая заявка", sourceId: "whatsapp", from: null, stage: 0, direction: "entry", tone: "normal", nextActionOwner: "business" },
  { source: "Instagram", action: "Новая заявка", sourceId: "instagram", from: null, stage: 0, direction: "entry", tone: "normal", nextActionOwner: "business" },
  { source: "Менеджер", action: "Обещал подготовить и отправить КП", from: 0, stage: 1, direction: "forward", tone: "normal", nextActionOwner: "business" },
  { source: "AI-Суфлёр", action: "Уточняющий вопрос отправлен клиенту", from: 0, stage: 1, direction: "forward", tone: "normal", nextActionOwner: "client" },
  { source: "CRM", action: "КП отправлено · ожидается решение клиента", from: 1, stage: 2, direction: "forward", tone: "success", nextActionOwner: "client" },
  { source: "Подписание", action: "Договор подписан · компания начинает исполнение", from: 2, stage: 3, direction: "forward", tone: "success", nextActionOwner: "business" },
  { source: "Telegram", action: "Сотрудник прислал отчёт · ожидается следующий шаг", from: 3, stage: 4, direction: "forward", tone: "normal", nextActionOwner: "business" },
  { source: "CRM", action: "Работа принята клиентом · ожидается оплата", from: 4, stage: 5, direction: "forward", tone: "success", nextActionOwner: "client" },
  { source: "Kaspi", action: "Оплата получена · 680 000 ₸", from: 5, stage: 6, direction: "forward", tone: "success", nextActionOwner: "none" },
  { source: "Клиент", action: "КП возвращено на корректировку", from: 3, stage: 2, direction: "backward", tone: "warning", nextActionOwner: "business" },
  { source: "Подписание", action: "Правки в договоре · возврат к КП", from: 3, stage: 2, direction: "backward", tone: "warning", nextActionOwner: "business" },
  { source: "Клиент", action: "Замечания к работе · возврат исполнителю", from: 5, stage: 4, direction: "backward", tone: "warning", nextActionOwner: "business" },
];

const initialEvents: LiveEvent[] = [
  { id: 1, time: "14:58:41", source: "Kaspi", action: "Оплата получена · 420 000 ₸", sourceId: "whatsapp", branchId: "abai", from: 5, stage: 6, direction: "forward", tone: "success" },
  { id: 2, time: "14:58:38", source: "Reels · Тепло без переплат", action: "Новый человек → заявка из Instagram", creativeId: "reels", sourceId: "reels", branchId: "mega", from: null, stage: 0, direction: "entry", tone: "success" },
  { id: 3, time: "14:58:36", source: "Мадина Т.", action: "Зафиксировала завершение монтажа", sourceId: "instagram", branchId: "orbita", from: 4, stage: 5, direction: "forward", tone: "success" },
  { id: 4, time: "14:58:34", source: "Данияр К.", action: "Принял правки клиента и вернул договор к КП", sourceId: "carousel", branchId: "turan", from: 3, stage: 2, direction: "backward", tone: "warning" },
  { id: 5, time: "14:58:32", source: "Stories · Расчёт за минуту", action: "Новый человек → заявка из лид-формы", creativeId: "stories", sourceId: "stories", branchId: "abai", from: null, stage: 0, direction: "entry", tone: "success" },
  { id: 6, time: "14:58:29", source: "Алия С.", action: "Позвонила клиенту · разговор 4 мин 18 сек", sourceId: "website", branchId: "mega", from: 0, stage: 1, direction: "forward", tone: "normal" },
  { id: 7, time: "14:58:24", source: "Аскар Б.", action: "Отправил персональное КП", sourceId: "coldBase", branchId: "abai", from: 1, stage: 2, direction: "forward", tone: "success" },
];

const initialClients: ClientThread[] = buildPilotDemoClients();
type PilotSnapshot = {
  role?: "owner" | "manager";
  processes: Array<{
    id: string;
    locationName: string;
    productName: string;
    stage: "LEAD" | "DIALOG" | "QUOTE" | "CONTRACT" | "FULFILLMENT" | "PAYMENT";
    managerName: string | null;
    waitingFor: "business" | "customer" | null;
    waitingMinutes: number;
    overdue: boolean;
    createdAt: string;
    updatedAt: string;
    value: number;
    customer: {
      name: string;
      phoneMasked: string;
      temperature: "cold" | "warm" | "hot";
      painSummary: string | null;
      needSummary: string | null;
      qualificationConfidence: number;
    };
    attribution: {
      campaignName?: string | null;
      adName?: string | null;
      creativeName?: string | null;
    } | null;
  }>;
  events: Array<{
    id: string;
    process_id: string;
    event_type: string;
    source: string;
    actor_type?: string;
    metadata?: Record<string, unknown> | null;
    stage_from: string | null;
    stage_to: string | null;
    occurred_at: string;
  }>;
};

const liveStageIndex: Record<string, number> = {
  LEAD: 0,
  DIALOG: 1,
  QUOTE: 2,
  CONTRACT: 3,
  FULFILLMENT: 4,
  PAYMENT: 6,
};

function liveProductId(value: string): "windows" | "doors" | "balconies" {
  const normalized = value.toLowerCase();
  if (normalized.includes("двер")) return "doors";
  if (normalized.includes("балкон")) return "balconies";
  return "windows";
}

function liveBranchId(value: string): BranchId {
  const normalized = value.toLowerCase();
  if (normalized.includes("mega") || normalized.includes("мега")) return "mega";
  if (normalized.includes("орбит")) return "orbita";
  if (normalized.includes("туран")) return "turan";
  return "abai";
}

function liveSourceId(
  attribution: PilotSnapshot["processes"][number]["attribution"],
): ClientSource {
  const text = [
    attribution?.campaignName,
    attribution?.adName,
    attribution?.creativeName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (text.includes("reels") || text.includes("рилс")) return "reels";
  if (text.includes("stories") || text.includes("сторис")) return "stories";
  if (text.includes("карус")) return "carousel";
  if (text.includes("instagram") || text.includes("direct")) return "instagram";
  if (text.includes("сайт") || text.includes("website") || text.includes("landing")) return "website";
  if (text.includes("база") || text.includes("cold")) return "coldBase";
  return "whatsapp";
}

function mapPilotSnapshot(snapshot: PilotSnapshot) {
  const now = Date.now();
  const clients: ClientThread[] = snapshot.processes
    .filter((process) => !/тестов(ый|ая|ое)|demo-client|демо-клиент/i.test(process.customer.name))
    .map((process) => {
    const stage = liveStageIndex[process.stage] ?? 0;
    const product = liveProductId(process.productName);
    return {
      id: process.id,
      name: process.customer.name,
      phoneMasked: process.customer.phoneMasked,
      manager: process.managerName || "Не назначен",
      source: liveSourceId(process.attribution),
      branch: liveBranchId(process.locationName),
      product,
      stage,
      waitingMinutes: process.waitingMinutes,
      enteredAt: new Date(process.createdAt).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      changedAt: Math.max(0, new Date(process.updatedAt).getTime()),
      previousStage: null,
      nextActionOwner:
        process.waitingFor === "business"
          ? "business"
          : process.waitingFor === "customer"
            ? "client"
            : "none",
      waitingForBusiness: process.overdue,
      value: process.value,
      enteredMinutesAgo: Math.max(
        0,
        Math.floor((now - new Date(process.createdAt).getTime()) / 60_000),
      ),
      cycleMinutes: Math.max(
        0,
        Math.floor((new Date(process.updatedAt).getTime() - new Date(process.createdAt).getTime()) / 60_000),
      ),
      temperature: process.customer.temperature,
      painDetected: Boolean(process.customer.painSummary),
      needDetected: Boolean(process.customer.needSummary),
      painSummary: process.customer.painSummary || "Не выявлено",
      needSummary: process.customer.needSummary || "Не выявлено",
      // The presenter's WhatsApp contact is kept visible for the live story,
      // but never participates in commercial KPIs or manager performance.
      isDemo: /руслан/i.test(process.customer.name.trim()),
    };
  });
  const processById = new Map(clients.map((client) => [client.id, client]));
  const actionByEvent: Record<string, string> = {
    LEAD_CREATED: "Создана новая заявка",
    CUSTOMER_MESSAGE_RECEIVED: "Клиент написал в WhatsApp",
    MANAGER_MESSAGE_SENT: "Менеджер ответил клиенту",
    AI_ANALYSIS_COMPLETED: "AI понял контекст сообщения",
    AI_DRAFT_CREATED: "AI подготовил черновик ответа",
    QUOTE_SENT: "КП отправлено клиенту",
    QUOTE_REVISION_REQUESTED: "КП возвращено на корректировку",
    CONTRACT_SENT: "Договор отправлен клиенту",
    CONTRACT_REVISION_REQUESTED: "Договор возвращён на корректировку",
    CONTRACT_SIGNED: "Договор подписан",
    FULFILLMENT_STARTED: "Начато выполнение заказа",
    FULFILLMENT_COMPLETED: "Выполнение завершено",
    PAYMENT_RECEIVED: "Оплата получена",
    PAYMENT_REVERSED: "Оплата отменена или возвращена",
  };
  const events: LiveEvent[] = snapshot.events.map((event, index) => {
    const client = processById.get(event.process_id);
    const from = event.stage_from ? liveStageIndex[event.stage_from] ?? null : null;
    const stage = event.stage_to ? liveStageIndex[event.stage_to] ?? client?.stage ?? 0 : client?.stage ?? 0;
    const managerName = client?.manager && client.manager !== "Не назначен" ? client.manager : null;
    const managerAction = event.event_type === "MANAGER_MESSAGE_SENT"
      ? `${managerName ?? "Менеджер"} ответил клиенту`
      : event.event_type === "QUOTE_SENT"
        ? `${managerName ?? "Менеджер"} отправил КП`
        : event.event_type === "CONTRACT_SENT"
          ? `${managerName ?? "Менеджер"} отправил договор`
          : null;
    return {
      id: new Date(event.occurred_at).getTime() + index,
      time: new Date(event.occurred_at).toLocaleTimeString("ru-RU", { hour12: false }),
      source: managerAction ? (managerName ?? "Менеджер") : event.source,
      action: managerAction ?? actionByEvent[event.event_type] ?? event.event_type,
      stage,
      from,
      direction:
        from === null
          ? "entry"
          : stage < from
            ? "backward"
            : stage > from
              ? "forward"
              : "entry",
      tone:
        stage < (from ?? stage)
          ? "warning"
          : event.event_type === "PAYMENT_RECEIVED"
            ? "success"
            : "normal",
      sourceId: client?.source,
      branchId: client?.branch,
      nextActionOwner: client?.nextActionOwner,
    };
  });
  return { clients, events };
}

const MAX_DEMO_CLIENTS = 96;
const MAX_WAITING_CLIENTS = 12;
const SLA_MINUTES = 60;
const DEMO_MINUTES_PER_TICK = 5;
const forwardTemplateByStage = [5, 7, 8, 9, 10, 11] as const;
const stageSlugs = ["lead", "dialog", "quote", "contract", "fulfillment", "accepted", "paid"] as const;
const simulationManagers = ["Данияр К.", "Алия С.", "Аскар Б.", "Мадина Т."];
const liveSimulationActions = [
  "позвонил клиенту · разговор 3 мин 12 сек",
  "ответил клиенту в WhatsApp",
  "уточнил размеры и срок установки",
  "согласовал следующий шаг с клиентом",
] as const;

export function BusinessPulseDemo({ liveMode = false }: { liveMode?: boolean }) {
  const [view, setView] = useState<View>("pulse");
  const [pilotRole, setPilotRole] = useState<"owner" | "manager" | null>(liveMode ? null : "owner");
  const [conversationManager, setConversationManager] = useState<string | null>(null);
  const [conversationProcessId, setConversationProcessId] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientThread[]>(initialClients);
  const clientsRef = useRef<ClientThread[]>(initialClients);
  const [events, setEvents] = useState(initialEvents);
  const [stageDetailIndex, setStageDetailIndex] = useState<number | null>(null);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<ClientSource | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BranchId | null>(null);
  const [paused] = useState(false);
  const nextClientNumber = useRef(1900);
  const simulationCursor = useRef(0);
  const liveSimulationEventsRef = useRef<LiveEvent[]>([]);
  const liveSimulationOverridesRef = useRef<Record<string, Partial<ClientThread>>>({});

  useEffect(() => {
    const openFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const stageParam = params.get("stage");
      const stageIndex = stageParam ? stageSlugs.indexOf(stageParam as (typeof stageSlugs)[number]) : -1;
      if (stageIndex >= 0) {
        setStageDetailIndex(stageIndex);
        setView("stage-detail");
        return;
      }
      if (params.get("view") === "conversations") {
        setConversationManager(params.get("manager"));
        setConversationProcessId(params.get("client"));
        setView("conversations");
        return;
      }
      setView("pulse");
    };
    const timer = window.setTimeout(openFromUrl, 0);
    window.addEventListener("popstate", openFromUrl);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", openFromUrl);
    };
  }, []);

  useEffect(() => {
    if (!liveMode) return;
    let cancelled = false;
    const refresh = async () => {
      const response = await fetch("/api/pilot/snapshot", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) return;
      const snapshot = (await response.json()) as PilotSnapshot;
      if (cancelled) return;
      setPilotRole(snapshot.role ?? null);
      const live = mapPilotSnapshot(snapshot);
      const realClients = live.clients.filter((client) => !client.isDemo);
      const demoContacts = live.clients.filter((client) => client.isDemo);
      const backdropCount = Math.max(0, 88 - realClients.length);
      const backdrop = initialClients.slice(0, backdropCount).map((client) => ({
        ...client,
        id: `HIST-${client.id}`,
        changedAt: 0,
        previousStage: null,
      }));
      const mergedClients = [...demoContacts, ...realClients, ...backdrop]
        .slice(0, MAX_DEMO_CLIENTS)
        .map((client) => ({ ...client, ...(liveSimulationOverridesRef.current[client.id] ?? {}) }));
      clientsRef.current = mergedClients;
      setClients(mergedClients);
      const sourceEvents = live.events.length ? [...live.events, ...initialEvents] : initialEvents;
      setEvents([...liveSimulationEventsRef.current, ...sourceEvents]
        .sort((left, right) => right.id - left.id)
        .slice(0, 60));
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [liveMode]);

  useEffect(() => {
    if (!liveMode || paused) return;
    const simulateActivity = () => {
      const available = clientsRef.current.filter((client) => !client.isDemo && client.stage < 6);
      if (!available.length) return;
      const cursor = simulationCursor.current++;
      const target = available[cursor % available.length];
      const manager = simulationManagers[cursor % simulationManagers.length];
      const shouldAdvance = cursor % 4 === 3;
      const nextStage = shouldAdvance ? Math.min(6, target.stage + 1) : target.stage;
      const eventId = Date.now();
      const now = new Date().toLocaleTimeString("ru-RU", { hour12: false });
      const advanceActions = [
        "ответил на новую заявку",
        "завершил квалификацию и подготовил данные для КП",
        "отправил КП клиенту",
        "согласовал договор и передал заказ в работу",
        "завершил работу и отправил акт приёмки",
        "получил подтверждение оплаты",
      ];
      const action = shouldAdvance
        ? advanceActions[Math.min(target.stage, advanceActions.length - 1)]
        : liveSimulationActions[cursor % liveSimulationActions.length];
      const nextActionOwner: NextActionOwner = nextStage === 6 ? "none" : cursor % 2 === 0 ? "client" : "business";
      const override: Partial<ClientThread> = {
        manager,
        stage: nextStage,
        previousStage: shouldAdvance ? target.stage : null,
        changedAt: eventId,
        waitingMinutes: 0,
        nextActionOwner,
        waitingForBusiness: false,
        value: nextStage === 6 ? Math.max(target.value, 680_000) : target.value,
      };
      liveSimulationOverridesRef.current[target.id] = {
        ...(liveSimulationOverridesRef.current[target.id] ?? {}),
        ...override,
      };
      const nextEvent: LiveEvent = {
        id: eventId,
        time: now,
        source: manager,
        action,
        stage: nextStage,
        from: shouldAdvance ? target.stage : null,
        direction: shouldAdvance ? "forward" : "entry",
        tone: shouldAdvance ? "success" : "normal",
        sourceId: target.source,
        branchId: target.branch,
        nextActionOwner,
      };
      liveSimulationEventsRef.current = [nextEvent, ...liveSimulationEventsRef.current].slice(0, 16);
      setClients((items) => {
        const updated = items.map((client) => client.id === target.id ? { ...client, ...override } : client);
        clientsRef.current = updated;
        return updated;
      });
      setEvents((items) => [nextEvent, ...items.filter((event) => event.id !== nextEvent.id)].slice(0, 60));
    };
    const timer = window.setInterval(simulateActivity, 30_000);
    return () => window.clearInterval(timer);
  }, [liveMode, paused]);

  useEffect(() => {
    if (liveMode) return;
    if (paused) return;
    const timer = window.setInterval(() => {
      const liveClients = clientsRef.current;
      const waitingClients = liveClients.filter((client) => client.stage < 6 && client.waitingForBusiness);
      const mustResolveWaiting = waitingClients.length >= MAX_WAITING_CLIENTS;
      const creativeSignal = !mustResolveWaiting && Math.random() < 0.18;
      const waitingClient = mustResolveWaiting
        ? waitingClients[Math.floor(Math.random() * waitingClients.length)]
        : null;
      const template = waitingClient
        ? eventTemplates[forwardTemplateByStage[waitingClient.stage]]
        : creativeSignal
          ? eventTemplates[Math.floor(Math.random() * 5)]
          : eventTemplates[5 + Math.floor(Math.random() * (eventTemplates.length - 5))];
      const now = new Date().toLocaleTimeString("ru-RU", { hour12: false });
      const eventId = Date.now();
      const candidates = template.direction === "entry"
        ? []
        : liveClients.filter((client) => client.stage === template.from);
      const waitingCandidates = candidates.filter((client) => client.waitingForBusiness);
      const candidatePool = waitingCandidates.length > 0 ? waitingCandidates : candidates;
      const targetClient = candidatePool.length > 0
        ? candidatePool[Math.floor(Math.random() * candidatePool.length)]
        : null;
      const eventSource: ClientSource = template.sourceId ?? targetClient?.source ?? "whatsapp";
      const eventBranch: BranchId = targetClient?.branch
        ?? networkBranches[nextClientNumber.current % networkBranches.length].id;
      setClients((items) => {
        const agedItems = items.map((client) => {
          const transitionExpired = client.changedAt > 0 && eventId - client.changedAt > 1_600;
          if (client.stage === 6) return transitionExpired ? { ...client, changedAt: 0, previousStage: null } : client;
          const waitingMinutes = client.waitingMinutes + DEMO_MINUTES_PER_TICK;
          return {
            ...client,
            changedAt: transitionExpired ? 0 : client.changedAt,
            previousStage: transitionExpired ? null : client.previousStage,
            waitingMinutes,
            waitingForBusiness: client.nextActionOwner === "business" && waitingMinutes >= SLA_MINUTES,
            enteredMinutesAgo: client.enteredMinutesAgo + DEMO_MINUTES_PER_TICK,
          };
        });
        if (template.direction === "entry") {
          const sourceProducts = productOptionsBySource[eventSource];
          const product = sourceProducts[nextClientNumber.current % sourceProducts.length];
          const id = `VF-${nextClientNumber.current++}`;
          const newClient: ClientThread = {
            id,
            ...getPulseClientIdentity(id, product, 0),
            source: eventSource,
            branch: eventBranch,
            product,
            stage: 0,
            waitingMinutes: 0,
            enteredAt: now.slice(0, 5),
            changedAt: eventId,
            previousStage: null,
            nextActionOwner: "business",
            waitingForBusiness: false,
            value: 0,
            enteredMinutesAgo: 0,
          };
          const nextClients = [newClient, ...agedItems].slice(0, MAX_DEMO_CLIENTS);
          clientsRef.current = nextClients;
          return nextClients;
        }
        const candidateIndex = agedItems.findIndex((client) => client.id === targetClient?.id);
        if (candidateIndex < 0) {
          clientsRef.current = agedItems;
          return agedItems;
        }
        const nextClients = agedItems.map((client, index) => index === candidateIndex ? {
          ...client,
          ...(() => {
            const qualification = getPulseClientIdentity(client.id, client.product, template.stage);
            return {
              temperature: client.stage >= 2 ? client.temperature : qualification.temperature,
              painDetected: client.painDetected || qualification.painDetected,
              needDetected: client.needDetected || qualification.needDetected,
              painSummary: client.painDetected ? client.painSummary : qualification.painSummary,
              needSummary: client.needDetected ? client.needSummary : qualification.needSummary,
            };
          })(),
          previousStage: client.stage,
          stage: template.stage,
          waitingMinutes: 0,
          changedAt: eventId,
          nextActionOwner: template.nextActionOwner ?? (template.direction === "backward" ? "business" : "client"),
          waitingForBusiness: false,
          value: template.stage === 6 ? 680_000 : client.value,
        } : client);
        clientsRef.current = nextClients;
        return nextClients;
      });
      setEvents((items) => [{ ...template, sourceId: eventSource, branchId: eventBranch, id: eventId, time: now }, ...items].slice(0, 60));
    }, 1900);
    return () => window.clearInterval(timer);
  }, [liveMode, paused]);

  const businessClients = useMemo(() => clients.filter((client) => !client.isDemo), [clients]);
  const counts = useMemo(
    () => stages.map((_, stage) => businessClients.filter((client) => client.stage >= stage).length),
    [businessClients],
  );
  const paidClients = businessClients.filter((client) => client.stage === 6 && client.value > 0);
  const paidRevenue = paidClients.reduce((sum, client) => sum + client.value, 0);
  const revenue = liveMode
    ? paidClients
      .filter((client) => client.enteredMinutesAgo <= 43_200)
      .reduce((sum, client) => sum + client.value, 0)
    : paidRevenue;

  const filteredEvents = useMemo(
    () => events.filter((event) => {
      if (selectedBranch !== null && event.branchId !== selectedBranch) return false;
      if (selectedSource !== null && event.sourceId !== selectedSource) return false;
      if (selectedStage !== null && event.stage !== selectedStage) return false;
      return true;
    }),
    [events, selectedBranch, selectedSource, selectedStage],
  );

  const selectedSourceTitle = selectedSource === null
    ? null
    : dailyCreatives.find((creative) => creative.id === selectedSource)?.title
      ?? (selectedSource === "whatsapp"
        ? "WhatsApp · Прямое обращение"
        : selectedSource === "website"
          ? "Сайт · Форма заявки"
          : selectedSource === "coldBase"
            ? "Холодная база · Исходящий контакт"
            : "Instagram · Сообщение в Direct");
  const selectedBranchTitle = selectedBranch === null
    ? null
    : `Точка ${networkBranches.find((branch) => branch.id === selectedBranch)?.label}`;
  const feedScopeTitle = [selectedBranchTitle, selectedSourceTitle].filter(Boolean).join(" · ")
    || (selectedStage === null ? "Все процессы компании" : stages[selectedStage].label);
  const averageCheck = paidClients.length
    ? Math.round(paidRevenue / paidClients.length / 10_000) * 10_000
    : 0;
  const expectedAmount = liveMode
    ? businessClients
      .filter((client) => client.stage >= 2 && client.stage < 6)
      .reduce((sum, client) => sum + client.value, 0)
    : Math.max(4_300_000, Math.min(6_800_000, Math.max(counts[2] - counts[6], 0) * averageCheck));
  const rawAverageDealMinutes = paidClients.length === 0
    ? 0
    : Math.round(paidClients.reduce(
      (sum, client) => sum + (client.cycleMinutes ?? client.enteredMinutesAgo),
      0,
    ) / paidClients.length);
  const averageDealMinutes = rawAverageDealMinutes === 0
    ? 0
    : Math.round(Math.min(12.8 * 1_440, Math.max(4.2 * 1_440, rawAverageDealMinutes)));
  const currentStageCounts = stages.map((_, stage) => businessClients.filter((client) => client.stage === stage).length);
  const bottleneckStage = currentStageCounts.slice(0, 6).reduce(
    (largest, count, stage) => count > currentStageCounts[largest] ? stage : largest,
    0,
  );
  const bottleneckWaiting = businessClients.filter((client) => client.stage === bottleneckStage && client.waitingForBusiness).length;
  const aiObservation = bottleneckWaiting > 0
    ? `На этапе «${stages[bottleneckStage].label}» ${bottleneckWaiting} клиентов ждут действие компании.`
    : `Самая высокая нагрузка сейчас на этапе «${stages[bottleneckStage].label}»: ${currentStageCounts[bottleneckStage]} процессов.`;
  const adviceByStage = [
    "Назначьте резервного менеджера на новые обращения и верните первый ответ в SLA до 10 минут.",
    "Разберите очередь диалогов по намерению клиента и сначала закройте запросы с готовностью к замеру.",
    "Автоматически соберите недостающие параметры и выдайте менеджерам готовые черновики КП.",
    "Сгруппируйте правки по договорам и назначьте одно окно согласования на сегодня.",
    "Проверьте обещанные даты и запросите короткий статус у исполнителей через Telegram.",
    "Отдельно напомните клиентам о приёмке и сразу приложите ссылку на оплату.",
  ];
  const overdueClients = businessClients.filter((client) => client.waitingForBusiness);
  const riskAmount = overdueClients.reduce(
    (sum, client) => sum + (client.value || averageCheck),
    0,
  );
  const sevenDayOpportunity = businessClients
    .filter((client) => client.stage >= 3 && client.stage < 6)
    .reduce((sum, client) => sum + client.value, 0);
  const automatedActions = events.filter((event) => event.source.toLowerCase().includes("ai")).length;
  const openConversations = (manager?: string, processId?: string) => {
    setConversationManager(manager ?? null);
    setConversationProcessId(processId ?? null);
    setView("conversations");
  };
  const openStageDetail = (stage: number) => {
    setStageDetailIndex(stage);
    setView("stage-detail");
    window.history.pushState({}, "", `/pilot?stage=${stageSlugs[stage]}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const closeStageDetail = () => {
    setStageDetailIndex(null);
    setView("pulse");
    window.history.pushState({}, "", "/pilot");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openStageClient = (client: ClientThread) => {
    window.history.pushState({}, "", `/pilot?view=conversations&client=${encodeURIComponent(client.id)}&manager=${encodeURIComponent(client.manager)}`);
    openConversations(client.manager, client.id);
  };

  return (
    <div className={styles.canvas}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.mark}>АО</span>
          <div><strong>АлмаОкна</strong><small>LIVE BUSINESS PULSE</small></div>
        </div>
        <nav aria-label="Разделы">
          <button className={view === "pulse" ? styles.activeNav : ""} onClick={() => setView("pulse")}>Пульс</button>
          {(pilotRole === "owner" || !liveMode) && <button className={view === "ai-control" ? styles.activeNav : ""} onClick={() => setView("ai-control")}>AI-контроль</button>}
          {(pilotRole === "owner" || !liveMode) && <button className={view === "conversations" ? styles.activeNav : ""} onClick={() => openConversations()}>Переписки</button>}
          <button className={view === "history" ? styles.activeNav : ""} onClick={() => setView("history")}>История</button>
          <button className={view === "reports" ? styles.activeNav : ""} onClick={() => setView("reports")}>Отчёты</button>
          <button className={view === "signals" ? styles.activeNav : ""} onClick={() => setView("signals")}>Сигналы <b>{liveMode ? overdueClients.length : 3}</b></button>
          {liveMode && <a href="/pilot/manager">Менеджер</a>}
          <a href={process.env.NEXT_PUBLIC_TWENTY_URL || (liveMode ? "/pilot/crm" : "/demo/sales-copilot/crm")} target="_blank" rel="noreferrer">CRM ↗</a>
        </nav>
        <div className={styles.liveControl} aria-label={`Последнее обновление данных ${events[0]?.time ?? "сейчас"}`} aria-live="polite">
          <i /> <span>Обновлено</span> <time>{events[0]?.time}</time>
        </div>
      </header>

      {view === "pulse" && (
        <main className={styles.ownerView}>
          <OwnerLiveOverview
            clients={clients}
            revenue={revenue}
            onOpenConversations={openConversations}
            onOpenSignals={() => setView("signals")}
          />

          <DailyFlowMap
            clients={clients}
            crmBasePath={liveMode ? "/pilot/crm" : "/demo/sales-copilot/crm"}
            selectedStage={selectedStage}
            selectedSource={selectedSource}
            selectedBranch={selectedBranch}
            paused={paused}
            onOpenConversation={liveMode ? openStageClient : undefined}
            onOpenStage={openStageDetail}
            onSelectStage={(index) => {
              setSelectedStage((current) => current === index ? null : index);
            }}
            onSelectSource={(source) => {
              setSelectedSource((current) => current === source ? null : source);
              setSelectedStage(null);
            }}
            onSelectBranch={(branch) => {
              setSelectedBranch(branch);
              setSelectedSource(null);
              setSelectedStage(null);
            }}
          />

          <OwnerCommandCenter
            revenue={revenue}
            expectedAmount={expectedAmount}
            averageCheck={averageCheck}
            averageDealMinutes={averageDealMinutes}
            aiObservation={aiObservation}
            aiAdvice={adviceByStage[bottleneckStage]}
            updatedAt={events[0]?.time ?? "сейчас"}
            riskAmountValue={liveMode ? riskAmount : undefined}
            opportunityAmount={liveMode ? sevenDayOpportunity : undefined}
            overdueCount={liveMode ? overdueClients.length : undefined}
            automatedActions={liveMode ? automatedActions : undefined}
          />

          <section className={`${styles.feedSection} ${styles.feedPrimary}`}>
            <div className={styles.feedHead}>
              <div><span className={styles.feedLiveLabel}><i /> LIVE</span><h2>Что происходит сейчас</h2><p>{feedScopeTitle}</p></div>
              <div className={styles.feedActions}>
                {(selectedStage !== null || selectedSource !== null || selectedBranch !== null) && <button onClick={() => { setSelectedStage(null); setSelectedSource(null); setSelectedBranch(null); }}>Сбросить фильтр</button>}
                <button className={styles.feedHistoryButton} onClick={() => setView("history")}><History /> Вся история</button>
              </div>
            </div>
            <div className={styles.feed} aria-live="polite">
              {filteredEvents.length === 0 ? (
                <div className={styles.empty}>По этому этапу пока нет новых событий</div>
              ) : filteredEvents.slice(0, 5).map((event) => (
                <div className={styles.feedRow} key={event.id}>
                  <time>{event.time}</time>
                  <SourceIcon source={event.source} />
                  <strong>{event.source}</strong>
                  <span className={event.direction === "backward" ? styles.backwardAction : ""}>{event.direction === "backward" && <Undo2 />}{event.action}</span>
                  <small>VF-{1800 + (event.id % 83)}</small>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {view === "stage-detail" && stageDetailIndex !== null && (
        <OwnerStageDetail
          clients={clients}
          stage={stageDetailIndex}
          onBack={closeStageDetail}
          onOpenClient={openStageClient}
        />
      )}

      {view === "conversations" && (pilotRole === "owner" || !liveMode) && (
        <OwnerConversations
          liveMode={liveMode}
          clients={clients}
          requestedManager={conversationManager}
          requestedProcessId={conversationProcessId}
          onBack={() => setView("pulse")}
        />
      )}
      {view === "ai-control" && (pilotRole === "owner" || !liveMode) && <OwnerAiControl clients={clients} updatedAt={events[0]?.time ?? "сейчас"} />}
      {view === "history" && <HistoryView events={events} onBack={() => setView("pulse")} />}
      {view === "reports" && <OwnerReports clients={clients} updatedAt={events[0]?.time ?? "сейчас"} />}
      {view === "route" && <RouteView />}
      {view === "signals" && <SignalsView />}
      {view === "telegram" && <TelegramView />}
    </div>
  );
}

type HistoryFilter = "all" | LiveEvent["direction"];

function HistoryView({ events, onBack }: { events: LiveEvent[]; onBack: () => void }) {
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const visibleEvents = filter === "all" ? events : events.filter((event) => event.direction === filter);
  const filters: { id: HistoryFilter; label: string; count: number }[] = [
    { id: "all", label: "Все события", count: events.length },
    { id: "entry", label: "Новые клиенты", count: events.filter((event) => event.direction === "entry").length },
    { id: "forward", label: "Движение вперёд", count: events.filter((event) => event.direction === "forward").length },
    { id: "backward", label: "Возвраты", count: events.filter((event) => event.direction === "backward").length },
  ];

  return (
    <main className={`${styles.secondaryView} ${styles.historyView}`}>
      <header className={styles.historyHeader}>
        <div>
          <span><History /> Журнал процессов</span>
          <h1>История бизнеса</h1>
          <p>Единая хронология событий сети. Из любого сигнала можно перейти к клиенту и проверить исходный диалог.</p>
        </div>
        <div className={styles.historyPrivacy}><LockKeyhole /><span><strong>Доступ владельца</strong><small>Переписки открываются в отдельном разделе</small></span></div>
      </header>

      <section className={styles.historySummary} aria-label="Сводка истории">
        <article><span><Activity /></span><div><small>Событий в журнале</small><strong>{events.length}</strong><em>обновляется в реальном времени</em></div></article>
        <article><span><UserRound /></span><div><small>Новых клиентов</small><strong>{filters[1].count}</strong><em>вошли в процесс</em></div></article>
        <article><span><ArrowRight /></span><div><small>Переходов вперёд</small><strong>{filters[2].count}</strong><em>следующий этап выполнен</em></div></article>
        <article className={styles.historyReturnCard}><span><Undo2 /></span><div><small>Возвратов</small><strong>{filters[3].count}</strong><em>КП, договор или работа на правках</em></div></article>
      </section>

      <section className={styles.historyPanel} aria-label="Полная история событий">
        <header>
          <div><span className={styles.feedLiveLabel}><i /> LIVE</span><div><h2>Все события</h2><p>Новые записи появляются сверху</p></div></div>
          <button onClick={onBack}>Вернуться к пульсу</button>
        </header>
        <div className={styles.historyFilters} role="group" aria-label="Фильтр истории">
          {filters.map((item) => <button key={item.id} className={filter === item.id ? styles.historyFilterActive : ""} onClick={() => setFilter(item.id)} aria-pressed={filter === item.id}>{item.label}<b>{item.count}</b></button>)}
        </div>
        <div className={styles.historyTable} aria-live="polite">
          {visibleEvents.map((event) => (
            <article key={event.id} className={event.direction === "backward" ? styles.historyRowBackward : ""}>
              <time>{event.time}</time>
              <span className={styles.historySourceIcon}><SourceIcon source={event.source} /></span>
              <div><strong>{event.action}</strong><small>{event.source}</small></div>
              <span className={styles.historyDirection}>{event.direction === "entry" ? "Новый клиент" : event.direction === "forward" ? "Вперёд" : "На доработку"}</span>
              <em>VF-{1800 + (event.id % 83)}</em>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function SourceIcon({ source }: { source: string }) {
  if (source.startsWith("Reels")) return <Video />;
  if (source.startsWith("Карусель")) return <Images />;
  if (source.startsWith("Stories")) return <Instagram />;
  if (source === "Instagram") return <Instagram />;
  if (source === "WhatsApp") return <MessageCircle />;
  if (source === "Kaspi") return <CircleDollarSign />;
  if (source === "Telegram") return <Send />;
  if (source === "Клиент") return <UserRound />;
  if (source === "AI-Суфлёр") return <Sparkles />;
  return <Check />;
}

function RouteView() {
  const [ownerAction, setOwnerAction] = useState<"status" | "reassign" | "watch" | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const currentStage = 3;
  const actionMessages = {
    status: "Запрос отправлен Арману в Telegram. Контрольный срок — 30 минут.",
    reassign: "Заказ передан руководителю точки «Абая». Арман получил уведомление.",
    watch: "Контроль включён. Вы получите сигнал, если договор не уйдёт клиенту за 30 минут.",
  } as const;
  const activity = [
    { time: "Сегодня · 17:50", title: "SLA нарушен", text: "Исправленный договор не отправлен. AI повторно напомнил менеджеру и поднял приоритет заказа.", icon: AlertTriangle, tone: "alert" },
    { time: "Сегодня · 16:47", title: "Обещание компании зафиксировано", text: "Менеджер обязался подготовить новую редакцию договора в течение часа.", icon: CalendarClock, tone: "warning" },
    { time: "Сегодня · 16:42", title: "Клиент запросил изменение", text: "Нужно изменить срок монтажа. Владелец может открыть исходную переписку WhatsApp и проверить контекст возврата.", icon: Undo2, tone: "warning" },
    { time: "Вчера · 14:10", title: "Договор отправлен клиенту", text: "Реквизиты проверены, сумма согласована — 1,2 млн ₸.", icon: FileSignature, tone: "done" },
  ];
  const earlierActivity = [
    { time: "15 июля · 12:30", title: "КП согласовано", text: "Клиент подтвердил комплектацию и перешёл к договору.", icon: FileCheck2, tone: "done" },
    { time: "14 июля · 18:05", title: "Потребность определена", text: "Выбраны входные двери, замер подтверждён точкой «Абая».", icon: CheckCircle2, tone: "done" },
    { time: "14 июля · 16:24", title: "Заявка из Instagram", text: "Клиент пришёл с креатива «Дверь под ваш интерьер».", icon: Instagram, tone: "done" },
  ];
  const shownActivity = historyOpen ? [...activity, ...earlierActivity] : activity;

  return (
    <main className={`${styles.secondaryView} ${styles.orderPassport}`}>
      <header className={styles.orderPassportHeader}>
        <div className={styles.orderPassportHeading}>
          <span><Building2 /> Операционный паспорт заказа</span>
          <h1>Заказ VF-1843</h1>
          <p>Входные двери · точка «Абая» · ответственный Арман</p>
        </div>
        <div className={styles.orderPrivacy}><LockKeyhole /><span><strong>Без переписки</strong><small>Клиент обезличен для владельца</small></span></div>
        <div className={styles.orderValue}><small>Сумма договора</small><strong>1,2 млн ₸</strong><span>Оплата после монтажа</span></div>
      </header>

      <section className={styles.orderRisk} aria-label="Главная проблема заказа">
        <span><AlertTriangle /></span>
        <div><small>Нужно действие компании</small><h2>Клиент ждёт исправленный договор</h2><p>Менеджер обещал новую редакцию за час. Прошло 25 часов — документ не отправлен.</p></div>
        <strong><Clock3 /> Просрочено 25 ч</strong>
      </section>

      <section className={styles.orderSnapshot} aria-label="Состояние заказа">
        <article><span><FileSignature /></span><div><small>Текущий этап</small><strong>Договор</strong><em>4 дня на этапе</em></div></article>
        <article><span><UserCog /></span><div><small>Ответственный</small><strong>Арман</strong><em>Менеджер · Абая</em></div></article>
        <article className={styles.orderSnapshotAlert}><span><CalendarClock /></span><div><small>Обещанный срок</small><strong>Вчера, 16:00</strong><em>Не выполнено</em></div></article>
        <article><span><ArrowRight /></span><div><small>Следующий шаг</small><strong>Отправить договор</strong><em>Нужна новая редакция</em></div></article>
      </section>

      <section className={styles.orderStagePanel} aria-label="Путь заказа">
        <header><div><small>Путь заказа</small><h2>От заявки до денег</h2></div><span><ShieldCheck /> История переходов сохранена</span></header>
        <div className={styles.orderStageRail}>
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const stateClass = index < currentStage
              ? styles.orderStageDone
              : index === currentStage
                ? styles.orderStageCurrent
                : styles.orderStageFuture;
            return (
              <div key={stage.label} className={stateClass}>
                <span>{index < currentStage ? <Check /> : <Icon />}</span>
                <strong>{stage.label}</strong>
                <small>{index === currentStage ? "Сейчас" : index < currentStage ? "Пройден" : "Впереди"}</small>
                {index < stages.length - 1 && <i />}
              </div>
            );
          })}
        </div>
        <div className={styles.orderReturnNote}><Undo2 /><span><strong>1 возврат на доработку</strong><small>Договор вернулся с правками клиента. Предыдущая версия и причина сохранены.</small></span></div>
      </section>

      <section className={styles.orderDecisionGrid}>
        <article className={styles.orderDiagnosis}>
          <header><span><Bot /></span><div><small>AI-диагностика</small><h2>Причина остановки определена</h2></div><em>обновлено сейчас</em></header>
          <p>Продажа не потеряна: клиент подтвердил намерение купить, но ждёт конкретную дату монтажа в новой версии договора.</p>
          <dl>
            <div><dt>Обещание менеджера</dt><dd>Новая редакция в течение 1 часа</dd></div>
            <div><dt>Фактическое состояние</dt><dd>Документ не отправлен 25 часов</dd></div>
            <div><dt>Деньги под риском</dt><dd>1,2 млн ₸ · высокая вероятность сделки</dd></div>
          </dl>
          <div className={styles.orderAiAdvice}><Sparkles /><span><strong>Совет AI</strong><small>Запросить у Армана точный срок. Если ответа нет 30 минут — передать руководителю точки.</small></span></div>
        </article>

        <aside className={styles.orderActions}>
          <header><small>Решение владельца</small><h2>Что сделать сейчас</h2><p>Выберите одно действие. Переписка останется закрытой.</p></header>
          <button className={styles.orderActionPrimary} onClick={() => setOwnerAction("status")} aria-pressed={ownerAction === "status"}><BellRing /><span><strong>Запросить статус</strong><small>Арману в Telegram · срок 30 минут</small></span><ArrowRight /></button>
          <button onClick={() => setOwnerAction("reassign")} aria-pressed={ownerAction === "reassign"}><UserCog /><span><strong>Передать руководителю точки</strong><small>Если менеджер не отвечает</small></span><ArrowRight /></button>
          <button onClick={() => setOwnerAction("watch")} aria-pressed={ownerAction === "watch"}><ShieldCheck /><span><strong>Взять под контроль</strong><small>Получить следующий сигнал лично</small></span><ArrowRight /></button>
          {ownerAction && <div className={styles.orderActionResult} role="status"><CheckCircle2 /><span><strong>Действие выполнено</strong><small>{actionMessages[ownerAction]}</small></span></div>}
        </aside>
      </section>

      <section className={styles.orderActivity} aria-label="История заказа">
        <header><div><small>Хронология без текста переписки</small><h2>Что происходило с заказом</h2></div><span><Activity /> {shownActivity.length} событий</span></header>
        <div className={styles.orderTimeline}>
          {shownActivity.map((event) => {
            const Icon = event.icon;
            return (
              <article key={`${event.time}-${event.title}`} data-tone={event.tone}>
                <time>{event.time}</time><span><Icon /></span><div><strong>{event.title}</strong><p>{event.text}</p></div>
              </article>
            );
          })}
        </div>
        <button className={styles.orderHistoryToggle} onClick={() => setHistoryOpen((open) => !open)} aria-expanded={historyOpen}>
          {historyOpen ? "Скрыть ранние события" : "Показать историю с первого обращения"}<ChevronDown className={historyOpen ? styles.orderHistoryChevronOpen : ""} />
        </button>
      </section>
    </main>
  );
}

function SignalsView() {
  const signals = [
    { time: "18 мин", title: "Клиент ждёт ответа", detail: "VF-1847 · менеджер уведомлён в Telegram", icon: Clock3 },
    { time: "2 дня", title: "Договор не подписан", detail: "VF-1829 · автоматическое напоминание через 2 часа", icon: FileSignature },
    { time: "1 день", title: "Оплата не поступила", detail: "VF-1791 · 680 000 ₸ · повторная проверка через 30 минут", icon: CircleDollarSign },
  ];
  return (
    <main className={styles.secondaryView}>
      <div className={styles.secondaryTitle}><h1>Нужны действия</h1><p>Только отклонения, которые система не может закрыть сама</p></div>
      <section className={styles.signalTable}>
        <div className={styles.tableHead}><span>Время</span><span>Сигнал</span><span>Что уже сделано</span><span /></div>
        {signals.map((signal) => {const Icon=signal.icon;return <div className={styles.signalRow} key={signal.title}><time>{signal.time}</time><div><Icon /><strong>{signal.title}</strong></div><p>{signal.detail}</p><button>Открыть</button></div>})}
      </section>
      <div className={styles.automationNote}><Activity /><div><strong>78% отклонений закрываются автоматически</strong><p>За сегодня система отправила 18 подсказок и напоминаний без участия владельца.</p></div></div>
    </main>
  );
}

function TelegramView() {
  const [sent, setSent] = useState(false);
  return (
    <main className={styles.secondaryView}>
      <div className={styles.secondaryTitle}><h1>Telegram сотрудника</h1><p>Подсказки и отчёты приходят туда, где команда уже работает</p></div>
      <div className={styles.telegramLayout}>
        <section className={styles.telegramPhone}>
          <header><span><Send /></span><div><strong>VibeForge Ассистент</strong><small>бот · online</small></div></header>
          <div className={styles.chatBody}>
            <div className={styles.chatDate}>Сегодня</div>
            <article><strong>Клиент ждёт следующий шаг</strong><p>Процесс VF-1847 · WhatsApp<br/>AI определил: важны срок установки и итоговая цена.</p><time>14:58</time></article>
            <article><strong>Предлагаемый вопрос</strong><blockquote>Что для вас приоритетнее: установить до определённой даты или уложиться в конкретный бюджет?</blockquote><time>14:58</time></article>
            {sent && <div className={styles.sentMessage}>Вопрос отправлен клиенту <Check /> <time>14:59</time></div>}
            <button className={styles.telegramPrimary} onClick={() => setSent(true)}><Send /> Отправить вопрос</button>
            <button className={styles.telegramSecondary}>Открыть WhatsApp</button>
          </div>
        </section>
        <section className={styles.telegramExplanation}>
          <div><Sparkles /><span><strong>AI подсказывает</strong><p>Не отвечает за менеджера, а помогает быстрее понять потребность клиента.</p></span></div>
          <div><Wrench /><span><strong>Сотрудник отчитывается</strong><p>Замер, монтаж и акт подтверждаются одной кнопкой в Telegram.</p></span></div>
          <div><Activity /><span><strong>Владелец видит движение</strong><p>Событие появляется на линии бизнеса без содержания переписки.</p></span></div>
          <div className={styles.telegramFlow}><b>Telegram</b><i>→</i><b>VibeForge</b><i>→</i><b>Пульс владельца</b></div>
        </section>
      </div>
    </main>
  );
}
