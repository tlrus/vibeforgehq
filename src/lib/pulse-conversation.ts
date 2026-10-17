import type { BusinessPulseClient } from './business-pulse-data';
import type { BusinessPulseJournalEntry } from '@/data/business-pulse-journal';

export type Temperature = 'unknown' | 'cold' | 'warm' | 'hot';
export type ConversationInput = {
  response: string;
  managerWords: string;
  promise: string;
  kind: 'call' | 'message' | 'meeting' | 'unknown';
};
export type ConversationAnalysis = {
  temperature: Temperature;
  objection: string;
  pain: string;
  desire: string;
  usefulPhrase: string;
  stopContact: boolean;
  needsClarification: boolean;
};
export type ConversationSnapshot = {
  version: 1;
  input: ConversationInput;
  analysis: ConversationAnalysis;
  reviewed: boolean;
};
export const emptyConversation: ConversationInput = { response: '', managerWords: '', promise: '', kind: 'call' };
export const temperatureMeta: Record<Temperature, { label: string; color: string }> = {
  unknown: { label: 'Интерес не определён', color: '#a9b3c5' },
  cold: { label: 'Холодный', color: '#7fb2ff' },
  warm: { label: 'Тёплый', color: '#f0bd70' },
  hot: { label: 'Горячий', color: '#65d7b5' },
};
const normalize = (text: string) => text.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

export function normalizeSource(raw: string) {
  const text = normalize(raw);
  if (/баз|спис(ок|ка)|журнал|таблиц/.test(text)) return 'База';
  if (/2\s*гис|2gis/.test(text)) return '2ГИС';
  if (/рекоменд|посоветовал|знаком/.test(text)) return 'Рекомендация';
  if (/сайт|заявк.*форм/.test(text)) return 'Сайт';
  if (/whatsapp|ватсап|вацап/.test(text)) return 'WhatsApp';
  if (/реклам/.test(text)) return 'Реклама';
  return raw.trim() || 'Не указан';
}

/** Deliberately conservative rules, not a language model. Original inputs are never rewritten. */
export function analyzeConversation(input: ConversationInput): ConversationAnalysis {
  const reply = normalize(input.response);
  const comment = normalize(input.managerWords);
  const text = `${reply} ${comment}`;
  const stopContact = /не (звоните|пишите|беспокойте|связывайтесь)|удалите.*(номер|контакт)/.test(text);
  const cold = /не хочет|не хочу|не интерес(но|ует|ен)|не нужно|не нужен|отказал/.test(reply);
  const warmer = /(?<!не )потеплел|(?<!не )заинтересовался|(?<!не )заинтересован/.test(text);
  const hot = /готов(ы)? (купить|оплатить|подписать)|давайте (договор|счет)|выстав(и|ьте).*счет/.test(reply);
  const later = /позже|подума|не сейчас|перезвон|через.*(дн|недел)/.test(reply);
  const budget = /(?<!не )дорого|нет (денег|бюджета)|слишком высокая цена/.test(reply);
  const info = /пришл|скинь|отправ.*(през|кп|предлож|информ)|хочу (посмотреть|узнать)/.test(reply);
  const conflict = (cold && hot) || (stopContact && (hot || warmer));
  const temperature: Temperature = stopContact ? 'cold' : conflict ? 'unknown' : hot ? 'hot' : warmer || info ? 'warm' : cold ? 'cold' : 'unknown';
  const painMatch = input.response.match(/(?:боль|проблема|мешает|теряем|теряются|не хватает)[^.!?\n]*/i);
  const desireMatch = input.response.match(/(?:хочу|хотим|нужно|нужны|важно|ищем)[^.!?\n]*/i);
  const objection = stopContact ? 'Не связываться' : cold ? 'Не хочет / нет интереса' : budget ? 'Цена / бюджет' : later ? 'Не сейчас / отложить' : '';
  return {
    temperature, objection,
    pain: budget ? 'Стоимость не подходит' : painMatch?.[0]?.trim() || '',
    desire: cold && !warmer ? '' : desireMatch?.[0]?.trim() || (info ? 'Получить материалы и разобраться' : ''),
    usefulPhrase: warmer && !conflict && !stopContact ? input.managerWords.trim() : '',
    stopContact,
    needsClarification: conflict || (!reply && !comment) || (!objection && !painMatch && !desireMatch && temperature === 'unknown'),
  };
}

export function makeConversation(input: ConversationInput, overrides?: Partial<ConversationAnalysis>): ConversationSnapshot {
  const analysis = analyzeConversation(input);
  return { version: 1, input: { ...input }, analysis: { ...analysis, ...overrides, stopContact: analysis.stopContact }, reviewed: Boolean(overrides && Object.keys(overrides).length) };
}

export function parseConversation(value: unknown): ConversationSnapshot | undefined {
  if (!value || typeof value !== 'object') return;
  const raw = value as Partial<ConversationSnapshot>;
  if (raw.version !== 1 || !raw.input || !raw.analysis) return;
  const input = raw.input;
  if (![input.response, input.managerWords, input.promise].every(v => typeof v === 'string')) return;
  const a = raw.analysis;
  if (!(a.temperature in temperatureMeta) || ![a.objection, a.pain, a.desire, a.usefulPhrase].every(v => typeof v === 'string')) return;
  return { version: 1, input: { ...input, kind: ['call', 'message', 'meeting', 'unknown'].includes(input.kind) ? input.kind : 'unknown' },
    analysis: { ...a, stopContact: a.stopContact === true, needsClarification: a.needsClarification === true }, reviewed: raw.reviewed === true };
}

export function entryConversation(entry: BusinessPulseJournalEntry): ConversationSnapshot {
  return parseConversation(entry.conversation) || makeConversation({ response: [entry.result, entry.pain].filter(Boolean).join('. '), managerWords: '', promise: entry.nextAction || '', kind: 'unknown' });
}

export function clientConversation(client: BusinessPulseClient): ConversationSnapshot {
  return parseConversation(client.conversation) || (client.history.length ? entryConversation([...client.history].sort((a,b) => a.date.localeCompare(b.date) || a.order - b.order).at(-1)!) : makeConversation({ response: client.note || '', managerWords: '', promise: client.nextAction || '', kind: 'unknown' }));
}

export function conversationText(input: ConversationInput) {
  return [input.response && `Клиент: ${input.response.trim()}`, input.managerWords && `Мой комментарий: ${input.managerWords.trim()}`, input.promise && `Договорились: ${input.promise.trim()}`].filter(Boolean).join('\n');
}

/** Latest known signals remain discoverable even if a later touch only confirms delivery. */
export function clientResponseSummary(client: BusinessPulseClient) {
  const latest = clientConversation(client);
  const previous = [...client.history].sort((a,b) => b.date.localeCompare(a.date) || b.order - a.order).map(entry => ({ snapshot: entryConversation(entry), date: entry.date }));
  const candidates = [{ snapshot: latest, date: client.updatedAt.slice(0,10) }, ...previous];
  const evidence = (['objection', 'pain', 'desire'] as const).map(key => {
    const found = candidates.find(item => item.snapshot.analysis[key]);
    return { key, value: found?.snapshot.analysis[key] || '', quote: found?.snapshot.input.response || found?.snapshot.input.managerWords || '', date: found?.date || '' };
  });
  return { analysis: { ...latest.analysis, ...Object.fromEntries(evidence.map(item => [item.key, item.value])) }, evidence };
}

export function pendingAction(text: string): string {
  const value = normalize(text).replace(/оптрав|отпарв|отпрпав/gi, 'отправ');
  if (/не (отправлять|высылать|звонить)|не (надо|нужно).*отправ/.test(value)) return '';
  if (/отправ(ить|лю|им)|выслать|скинуть|прислать|пришлите/.test(value)) {
    if (/кп|коммерческ|расчет/.test(value)) return 'Отправить КП / расчёт';
    if (/през|материал|информ|видео/.test(value)) return 'Отправить презентацию / материалы';
  }
  if (/встреч|демо/.test(value) && !/провел|прошла|состоял|отмен/.test(value)) return text.trim();
  if (/^(позвонить|перезвонить|связаться|написать|проверить|подготовить|согласовать|уточнить|показать|провести|созвон|звонок|отправить)/.test(value)) return text.trim();
  return '';
}

export function concreteAction(client: BusinessPulseClient) {
  if (client.stage === 6 || client.nextActionDismissed || clientConversation(client).analysis.stopContact) return '';
  if (client.nextAction) return pendingAction(client.nextAction);
  // No imagined completed action or industry-based recommendation in the daily queue.
  return pendingAction(client.conversation?.input.promise || client.note || '');
}

export function businessDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qyzylorda', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function todayWork(clients: BusinessPulseClient[], now = new Date()) {
  const day = businessDay(now);
  const tasks = clients.flatMap(client => {
    const action = concreteAction(client);
    if (!action) return [];
    const due = client.nextActionDueAt && Number.isFinite(Date.parse(client.nextActionDueAt)) ? client.nextActionDueAt : '';
    const dueDay = due ? businessDay(new Date(due)) : '';
    if (dueDay > day) return [];
    return [{ client, action, state: !due ? 'unscheduled' as const : dueDay < day ? 'overdue' as const : 'today' as const, due }];
  }).sort((a,b) => (a.due || '9999').localeCompare(b.due || '9999'));
  // Count a distinct client's first explicitly recorded CALL, never message/edit events.
  const firstCalls = clients.filter(client => {
    const first = [...client.history].sort((a,b) => a.date.localeCompare(b.date) || a.order - b.order).find(entry => entry.conversation ? entry.conversation.input.kind === 'call' : /^(звонок|телефон)$/i.test(entry.channel.trim()));
    return first?.date === day;
  });
  const newCandidates = clients.filter(client => client.stage === 0 && !clientConversation(client).analysis.stopContact && !client.history.length && !(client.events || []).some(e => e.type === 'activity'));
  return { tasks, firstCalls: firstCalls.length, remaining: Math.max(0, 30 - firstCalls.length), newCandidates };
}

export const responseGroups = [
  { id: 'all', label: 'Все ответы', hint: 'Контекст из записанных разговоров' },
  { id: 'objection', label: 'Возражения', hint: 'Что останавливает клиента' },
  { id: 'pain', label: 'Боли', hint: 'Какие проблемы названы' },
  { id: 'desire', label: 'Желания', hint: 'Какого результата ждут' },
  { id: 'unknown', label: 'Уточнить', hint: 'Недостаточно контекста или противоречие' },
] as const;
export type ResponseGroup = typeof responseGroups[number]['id'];
export function inResponseGroup(a: ConversationAnalysis, group: ResponseGroup) {
  return group === 'all' || (group === 'unknown' ? a.needsClarification : Boolean(a[group]));
}
