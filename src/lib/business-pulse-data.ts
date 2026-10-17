import { businessPulseJournal, type BusinessPulseJournalEntry } from "@/data/business-pulse-journal";
import type { PulseEvent } from './business-pulse-workspace';
import { parseConversation, type ConversationSnapshot } from './pulse-conversation';

export type BusinessPulseView = "pulse" | "crm" | "ai-control";
export type BusinessPulseSectorId = "construction" | "education" | "other";

export type BusinessPulseClient = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  product: BusinessPulseSectorId;
  source: string;
  manager: string;
  stage: number;
  value: number;
  note: string;
  waitingForBusiness: boolean;
  createdAt: string;
  updatedAt: string;
  history: BusinessPulseJournalEntry[];
  events?: PulseEvent[];
  nextAction?: string;
  nextActionDueAt?: string;
  nextActionDismissed?: boolean;
  agentComment?: string;
  outcome?: 'open' | 'won' | 'lost' | 'not_relevant';
  parentClientId?: string;
  sourceRaw?: string;
  conversation?: ConversationSnapshot;
};

export type BusinessPulseClientForm = Pick<
  BusinessPulseClient,
  "name" | "contact" | "phone" | "product" | "source" | "sourceRaw" | "manager" | "stage" | "value" | "note" | "waitingForBusiness" | "nextAction" | "nextActionDueAt" | "agentComment" | "outcome" | "parentClientId"
>;

export const businessPulseStorageKey = "vibeforge-business-pulse-manual-v2";

export const businessPulseStages = [
  { label: "База", short: "Новый контакт", color: "#6f9dff" },
  { label: "Связались", short: "Первый разговор", color: "#70b7f5" },
  { label: "Презентация", short: "Материалы отправлены", color: "#9f8cff" },
  { label: "Повторный контакт", short: "Нужно вернуться", color: "#b68aff" },
  { label: "Встреча / демо", short: "Назначен разговор", color: "#51d0ad" },
  { label: "Переговоры", short: "Обсуждаем решение", color: "#f0b35e" },
  { label: "Закрыто", short: "Неактуально сейчас", color: "#7e8797" },
] as const;

export const businessPulseSectors: { id: BusinessPulseSectorId; label: string; color: string }[] = [
  { id: "construction", label: "Строительство", color: "#6f9dff" },
  { id: "education", label: "Образование", color: "#b68aff" },
  { id: "other", label: "Другие отрасли", color: "#51d0ad" },
];

export const businessPulseSources = ["2ГИС", "WhatsApp", "Телефон", "Email", "Рекомендация", "Ручной ввод", "Другое"];

export const emptyBusinessPulseForm: BusinessPulseClientForm = {
  name: "",
  contact: "",
  phone: "",
  product: "other",
  source: "Ручной ввод",
  manager: "Менеджер BP",
  stage: 0,
  value: 0,
  note: "",
  waitingForBusiness: false,
};

const closedSignals = [
  "не интерес", "не нужен", "не нужно", "не подходит", "закрыл", "не работает", "не тот номер",
  "свои ит", "есть ит команд", "уже использу", "маленьк", "переехал", "отказ", "не занимается",
];

function normalizedText(entry: BusinessPulseJournalEntry) {
  return [entry.result, entry.achieved, entry.difficulty, entry.nextAction, entry.tools, entry.missed, entry.pain, ...entry.details]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ru-RU");
}

export function stageForJournalEntry(entry: BusinessPulseJournalEntry) {
  const text = normalizedText(entry);
  if (closedSignals.some((signal) => text.includes(signal))) return 6;
  if (/заинтерес|цена|договор|решени|обсуд|думает|партн[её]р/.test(text)) return 5;
  if (/встреч|демо|онлайн|приехать|назначить/.test(text)) return 4;
  if (/перезвон|позвон|набрать|напомн|написать|понедельник|недел|завтра|позже|утро|вечер/.test(text)) return 3;
  if (/през|письм|сайт|видео|ватсап|whatsapp/.test(text)) return 2;
  if (text || entry.contact || entry.channel) return 1;
  return 0;
}

export function sectorForCompany(company: string): BusinessPulseSectorId {
  const value = company.toLocaleLowerCase("ru-RU");
  if (/строй|окон|пласт|кров|монтаж|двер|ворот|steel|алу|alu |цемент|вент|энерго|арматур/.test(value)) return "construction";
  if (/school|учеб|образов|education|edu|academy|универс|интеллмед|центр развития/.test(value)) return "education";
  return "other";
}

export function sourceForJournalEntry(entry: BusinessPulseJournalEntry) {
  const value = `${entry.channel} ${entry.result}`.toLocaleLowerCase("ru-RU");
  if (/whatsapp|ватсап|вастап/.test(value)) return "WhatsApp";
  if (/2\s*гис/.test(value)) return "2ГИС";
  if (/@|почт|email|письм/.test(value)) return "Email";
  if (/\d{6,}/.test(value)) return "Телефон";
  return "Ручной ввод";
}

export function nextActionForClient(client: BusinessPulseClient) {
  if (client.nextAction) return client.nextAction;
  const latest = [...client.history].reverse().find((entry) => entry.nextAction || entry.result || entry.achieved);
  if (!latest) return "Связаться и зафиксировать следующий шаг";
  if (latest.nextAction) return latest.nextAction;
  const text = `${latest.result} ${latest.achieved}`.toLocaleLowerCase("ru-RU");
  if (/отправил|отпарвил|оптравил|през|письм/.test(text) && !/отправить|отпарвить|оптравить/.test(latest.result.toLocaleLowerCase("ru-RU"))) {
    return "Уточнить впечатление от отправленных материалов";
  }
  if (client.stage === 6) return "Зафиксировать причину закрытия";
  if (client.stage >= 4) return "Согласовать решение, ответственного и срок";
  if (client.stage === 3) return "Продолжить разговор и согласовать следующий контакт";
  return "Связаться и зафиксировать следующий шаг";
}

function summaryForEntry(entry: BusinessPulseJournalEntry) {
  return entry.result || entry.nextAction || entry.achieved || entry.difficulty || entry.pain || "Контакт добавлен в журнал";
}

function activityTime(entry: BusinessPulseJournalEntry) {
  const minutes = 8 * 60 + (entry.order % 120) * 5;
  const hours = Math.min(21, Math.floor(minutes / 60));
  const minute = minutes % 60;
  return `${entry.date}T${String(hours).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:00`;
}

export function buildBusinessPulseSeedClients(): BusinessPulseClient[] {
  const grouped = new Map<string, BusinessPulseJournalEntry[]>();
  for (const entry of businessPulseJournal) {
    const key = entry.company.replace(/\s+/g, " ").trim().toLocaleLowerCase("ru-RU");
    const current = grouped.get(key) ?? [];
    current.push(entry);
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).map((history, index) => {
    const latest = history.at(-1) ?? history[0];
    const latestContact = [...history].reverse().find((entry) => entry.contact)?.contact ?? "";
    const latestChannel = [...history].reverse().find((entry) => entry.channel)?.channel ?? "";
    const stage = stageForJournalEntry(latest);
    return {
      id: `journal-${String(index + 1).padStart(3, "0")}`,
      name: history[0].company,
      contact: latestContact,
      phone: latestChannel,
      product: sectorForCompany(history[0].company),
      source: sourceForJournalEntry(latest),
      manager: "Менеджер BP",
      stage,
      value: 0,
      note: summaryForEntry(latest),
      waitingForBusiness: stage < 6,
      createdAt: activityTime(history[0]),
      updatedAt: activityTime(latest),
      history,
    };
  }).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function parseStoredBusinessPulseClients(raw: string | null): BusinessPulseClient[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const client = item as Partial<BusinessPulseClient>;
      if (typeof client.id !== "string" || typeof client.name !== "string" || !Number.isInteger(client.stage) || client.stage! < 0 || client.stage! >= businessPulseStages.length) return [];
      return [{
        id: client.id,
        name: client.name,
        stage: client.stage!,
        contact: client.contact ?? "",
        phone: client.phone ?? "",
        product: businessPulseSectors.some((sector) => sector.id === client.product) ? client.product as BusinessPulseSectorId : "other",
        source: client.source ?? "Ручной ввод",
        sourceRaw: typeof client.sourceRaw === 'string' ? client.sourceRaw : client.source ?? '',
        conversation: parseConversation(client.conversation),
        manager: client.manager ?? "Менеджер BP",
        value: Number(client.value) || 0,
        note: client.note ?? "",
        waitingForBusiness: client.waitingForBusiness === true,
        createdAt: client.createdAt ?? new Date().toISOString(),
        updatedAt: client.updatedAt ?? client.createdAt ?? new Date().toISOString(),
        history: Array.isArray(client.history) ? client.history.filter(entry => entry && typeof entry === 'object').map((entry) => ({ ...entry, conversation: parseConversation(entry.conversation), details: Array.isArray(entry.details) ? entry.details : [] })) : [],
        events: Array.isArray(client.events) ? client.events.filter(e => e && typeof e.id === 'string' && typeof e.at === 'string' && typeof e.text === 'string') : [],
        nextAction: typeof client.nextAction === 'string' ? client.nextAction : '',
        nextActionDismissed: client.nextActionDismissed === true,
        agentComment: typeof client.agentComment === 'string' ? client.agentComment : '',
        nextActionDueAt: typeof client.nextActionDueAt === 'string' && Number.isFinite(Date.parse(client.nextActionDueAt)) ? client.nextActionDueAt : '',
        outcome: ['open', 'won', 'lost', 'not_relevant'].includes(client.outcome ?? '') ? client.outcome : client.stage === 6 ? 'not_relevant' : 'open',
        parentClientId: typeof client.parentClientId === 'string' ? client.parentClientId : undefined,
      } satisfies BusinessPulseClient];
    });
  } catch {
    return [];
  }
}

export function businessPulseSectorMeta(id: BusinessPulseSectorId) {
  return businessPulseSectors.find((sector) => sector.id === id) ?? businessPulseSectors[2];
}
