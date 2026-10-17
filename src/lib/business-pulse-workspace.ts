import { businessPulseStages, stageForJournalEntry, type BusinessPulseClient } from './business-pulse-data';
import type { BusinessPulseJournalEntry } from '@/data/business-pulse-journal';

export type PulseEvent = {
  id: string; at: string; type: 'created' | 'updated' | 'stage' | 'activity';
  text: string; actor: string; from?: number; to?: number;
  touchOrder?: number;
};

export type DailyCallItem = {
  id: string;
  clientId: string;
  clientName: string;
  contact: string;
  phone: string;
  product: BusinessPulseClient['product'];
  comment: string;
  channel: string;
  advanced: boolean;
  fromStage?: number;
  toStage: number;
  time?: string;
  order: number;
  touchNumber: number;
};

export type DailyCallAnalysis = {
  day: string;
  dayLabel: string;
  totalCalls: number;
  newClientCount: number;
  repeatTouchCount: number;
  repeatClientCount: number;
  advancedCount: number;
  advancedRatePercent: number;
  sameStageCount: number;
  closedCount: number;
  clientIds: string[];
  advancedClientIds: string[];
  actions: DailyCallItem[];
};

export function localDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qyzylorda', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function localYesterday(now = new Date()) {
  return localDay(new Date(now.getTime() - 86400000));
}

export function formatDayLabel(day: string, now = new Date()): string {
  const today = localDay(now);
  const yesterday = localYesterday(now);
  if (day === today) return 'Сегодня';
  if (day === yesterday) return 'Вчера';
  const parts = day.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }
  return day;
}

export function hasInteractionOnDay(client: BusinessPulseClient, day: string) {
  return (client.history ?? []).some((entry) => entry.date === day) ||
    (client.events ?? []).some((e) => (e.type === 'activity' || e.type === 'stage' || e.type === 'created') && localDay(new Date(e.at)) === day);
}

export function getUniqueInteractionDays(clients: BusinessPulseClient[], now = new Date()): string[] {
  const days = new Set<string>();
  days.add(localDay(now));
  days.add(localYesterday(now));
  for (const client of clients) {
    for (const h of client.history ?? []) {
      if (h.date) days.add(h.date);
    }
    for (const e of client.events ?? []) {
      if (e.at) days.add(localDay(new Date(e.at)));
    }
  }
  return Array.from(days).sort((a, b) => b.localeCompare(a));
}

export function getDailyCallsAnalysis(clients: BusinessPulseClient[], day: string): DailyCallAnalysis {
  const actions: DailyCallItem[] = [];
  for (const client of clients) {
    const usedEvents = new Set<string>();
    const history = [...(client.history ?? [])].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
    const touches: (DailyCallItem & { day: string })[] = history.map((entry, index) => {
      const event = (client.events ?? []).find(e => !usedEvents.has(e.id) && localDay(new Date(e.at)) === entry.date && (e.touchOrder === entry.order || e.text.trim() === entry.result?.trim()));
      if (event) usedEvents.add(event.id);
      const fromStage = event?.from ?? (event ? client.stage : index ? stageForJournalEntry(history[index - 1]) : 0);
      const toStage = event?.to ?? (event ? client.stage : stageForJournalEntry(entry));
      return {
        id: event?.id || `${client.id}-h-${entry.order}-${index}`,
        clientId: client.id, clientName: client.name, contact: entry.contact || client.contact,
        phone: client.phone, product: client.product,
        comment: entry.result || entry.nextAction || entry.achieved || 'Касание зафиксировано',
        channel: entry.channel || client.source || 'Не указан',
        advanced: toStage > fromStage && toStage < 6, fromStage, toStage,
        time: event ? new Date(event.at).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Qyzylorda', hour: '2-digit', minute: '2-digit' }) : undefined,
        order: event ? Date.parse(event.at) : Date.parse(entry.date + 'T00:00:00+05:00') + index,
        day: entry.date, touchNumber: 0,
      };
    });
    // History is canonical. Only legacy activity-only events add missing touches.
    // Creating/editing a card or moving a stage alone is not a customer contact.
    for (const event of client.events ?? []) {
      if (event.type !== 'activity' || usedEvents.has(event.id)) continue;
      touches.push({
        id: event.id, clientId: client.id, clientName: client.name, contact: client.contact,
        phone: client.phone, product: client.product, comment: event.text || 'Касание зафиксировано',
        channel: client.source || 'Не указан', advanced: false, toStage: client.stage,
        time: new Date(event.at).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Qyzylorda', hour: '2-digit', minute: '2-digit' }),
        order: Date.parse(event.at), day: localDay(new Date(event.at)), touchNumber: 0,
      });
    }
    touches.sort((a, b) => a.order - b.order);
    touches.forEach((touch, index) => {
      if (touch.day === day) actions.push({ ...touch, touchNumber: index + 1 });
    });
  }
  actions.sort((a, b) => a.order - b.order);
  const totalCalls = actions.length;
  const advancedCount = actions.filter(a => a.advanced).length;
  const closedCount = actions.filter(a => a.toStage === 6).length;
  return {
    day, dayLabel: formatDayLabel(day), totalCalls, advancedCount, closedCount,
    sameStageCount: totalCalls - advancedCount - closedCount,
    advancedRatePercent: totalCalls ? Math.round(advancedCount / totalCalls * 100) : 0,
    clientIds: [...new Set(actions.map(a => a.clientId))],
    advancedClientIds: [...new Set(actions.filter(a => a.advanced).map(a => a.clientId))],
    newClientCount: actions.filter(a => a.touchNumber === 1).length,
    repeatTouchCount: actions.filter(a => a.touchNumber > 1).length,
    repeatClientCount: new Set(actions.filter(a => a.touchNumber > 1).map(a => a.clientId)).size,
    actions,
  };
}

export function updatePulseClient(client: BusinessPulseClient, changes: Partial<BusinessPulseClient>, text = '', type: PulseEvent['type'] = 'updated', now = new Date().toISOString()): BusinessPulseClient {
  const stage = changes.stage ?? client.stage;
  const changedStage = stage !== client.stage;
  const isActivity = Boolean(text && (type === 'activity' || type === 'created' || (type === 'updated' && text !== 'Карточка обновлена')));
  const newTouch: BusinessPulseJournalEntry[] = isActivity ? [{
    date: localDay(new Date(now)),
    company: changes.name || client.name,
    contact: changes.contact ?? client.contact ?? '',
    channel: changes.conversation ? ({ call: 'Звонок', message: 'Сообщение', meeting: 'Встреча', unknown: 'Не указан' }[changes.conversation.input.kind]) : changes.phone || client.phone || client.source || 'WhatsApp',
    result: text,
    conversation: changes.conversation,
    achieved: '',
    difficulty: '',
    nextAction: changes.nextAction ?? client.nextAction ?? '',
    tools: '',
    missed: '',
    pain: '',
    details: [],
    order: (client.history?.length ?? 0),
  }] : [];
  const event: PulseEvent = { id: crypto.randomUUID(), at: now, type: changedStage ? 'stage' : type,
    ...(isActivity ? { touchOrder: newTouch[0].order } : {}),
    actor: changes.manager || client.manager || 'Сотрудник',
    text: text || (changedStage ? `${businessPulseStages[client.stage].label} → ${businessPulseStages[stage].label}` : 'Карточка обновлена'),
    ...(changedStage || isActivity ? { from: client.stage, to: stage } : {}),
  };
  return { ...client, ...changes, stage, updatedAt: now,
    history: [...(client.history ?? []), ...newTouch],
    note: isActivity ? text : (changes.note ?? client.note),
    waitingForBusiness: stage === 6 ? false : changes.waitingForBusiness ?? (client.stage === 6 ? true : client.waitingForBusiness),
    outcome: stage === 6 ? changes.outcome ?? client.outcome ?? 'not_relevant' : 'open',
    events: [...(client.events ?? []), event] };
}

export function pulseRisk(client: BusinessPulseClient, now = Date.now()) {
  if (client.stage === 6 || !client.waitingForBusiness) return null;
  const due = client.nextActionDueAt ? Date.parse(client.nextActionDueAt) : NaN;
  if (Number.isFinite(due)) return due < now ? { kind: 'overdue', label: 'Срок обещания пропущен', since: due } : null;
  const last = Date.parse(client.updatedAt);
  return now - last > 86400000 ? { kind: 'stale', label: 'Больше суток без следующего контакта', since: last } : null;
}

export function reachedPulseStage(client: BusinessPulseClient, stage: number) {
  // Closing a contact is not evidence that it passed every sales stage.
  return stage === 0 || client.stage === stage || (client.events ?? []).some(e => e.from === stage || e.to === stage);
}

export function demoPulseClients(now = new Date()): BusinessPulseClient[] {
  return ['Север · офисные перегородки', 'Маяк · оснащение магазина', 'Контур · повторный заказ', 'Атлас · сервисное обслуживание', 'Линия · комплект оборудования', 'Вектор · новый филиал', 'Берег · согласование условий', 'Ритм · консультация'].map((name, i) => ({
    id: `demo-${i + 1}`, name, contact: ['Анна', 'Данияр', 'Алина'][i % 3], phone: '', product: i % 2 ? 'other' : 'construction',
    source: i % 2 ? 'Телефон' : 'WhatsApp', manager: i % 2 ? 'Данияр' : 'Алина', stage: [2, 5, 3, 4, 6, 1, 5, 0][i],
    value: [780000, 1200000, 420000, 250000, 650000, 0, 900000, 0][i],
    note: i === 0 ? 'Клиент согласовал состав работ. Обещали отправить КП к 12:00; отправка ещё не подтверждена.' : 'Демонстрационные данные. Объём и следующий контакт согласованы с клиентом.',
    waitingForBusiness: i !== 4, createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - (i + 1) * 3600000).toISOString(), history: [], events: [],
    nextAction: i === 0 ? 'Отправить КП на согласованный состав работ' : 'Уточнить решение и согласовать следующий шаг',
    nextActionDueAt: new Date(now.getTime() + (i === 0 ? -2 : i + 1) * 3600000).toISOString(),
    outcome: i === 4 ? 'won' : 'open',
  }));
}
