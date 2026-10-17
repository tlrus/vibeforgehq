"use client";

import { z } from 'zod';
import type { BusinessPulseClient } from './business-pulse-data';
import type { PulseAgentBrief, PulseAgentFacts, PulseAgentNextAction } from './pulse-agent';
import { temperatureMeta, type ConversationSnapshot } from './pulse-conversation';

export const pulseAgentRoles = [
  { id: 'atlas', name: 'Атлас', role: 'Аналитик клиента', action: 'brief', task: 'Бриф перед звонком', description: 'Собирает историю, цель разговора и вопросы к клиенту.', color: '#90b5ff' },
  { id: 'mayak', name: 'Маяк', role: 'Планировщик касаний', action: 'suggest_next', task: 'Следующий шаг', description: 'Предлагает действие, срок и черновик сообщения.', color: '#8bd7bc' },
  { id: 'linza', name: 'Линза', role: 'Исследователь фактов', action: 'extract_facts', task: 'Разобрать факты', description: 'Находит в записи бюджет, сроки и возражения.', color: '#e8bb83' },
  { id: 'alfred', name: 'Альфред', role: 'Локальный координатор', action: null, task: 'Связь с вашим ПК', description: 'Будет получать записи и распределять работу на ПК.', color: '#c5bbdd' },
] as const;
export type PulseAgentId = typeof pulseAgentRoles[number]['id'];
export type PulseAgentAction = Exclude<typeof pulseAgentRoles[number]['action'], null>;
export type PulseAgentResult = PulseAgentBrief | PulseAgentNextAction | PulseAgentFacts;
export type AgentRunStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted';

const source = z.enum(['openai', 'heuristic']);
const strings = z.array(z.string());
const briefSchema = z.object({ summary: z.string(), callGoal: z.string(), script: z.string(), keyPains: strings, talkingPoints: strings, suggestedQuestions: strings, objectionTips: strings, source, modelUsed: z.string().optional() });
const nextSchema = z.object({ action: z.string(), dueAtIso: z.string().datetime(), dueLabel: z.string(), channel: z.enum(['phone', 'whatsapp', 'email']), messageDraft: z.string(), reason: z.string(), source });
const factsSchema = z.object({ budget: z.string().nullable(), decisionMaker: z.string().nullable(), timeline: z.string().nullable(), competitors: strings, objections: strings, keyFacts: strings, source });
const resultSchemas = { brief: briefSchema, suggest_next: nextSchema, extract_facts: factsSchema };
const runSchema = z.object({
  id: z.string(), action: z.enum(['brief', 'suggest_next', 'extract_facts']),
  clientId: z.string(), clientName: z.string(), clientUpdatedAt: z.string(),
  startedAt: z.string().datetime(), finishedAt: z.string().datetime().optional(),
  status: z.enum(['running', 'completed', 'failed', 'cancelled', 'interrupted']),
  summary: z.string(), result: z.union([briefSchema, nextSchema, factsSchema]).optional(),
});
export type PulseAgentRun = z.infer<typeof runSchema>;
const MAX_RUNS = 100;
export const AGENT_ACTIVITY_EVENT = 'business-pulse-agent-activity';
export const agentJournalKey = (demo = false) => `business-pulse-agent-journal-v1${demo ? '-demo' : ''}`;
const unsaved = new Map<string, PulseAgentRun[]>();
const active = new Set<string>();

export function agentRunStatus(run: PulseAgentRun, now = Date.now()): AgentRunStatus {
  if (run.status === 'running' && !active.has(run.id) && now - Date.parse(run.startedAt) > 60_000) return 'interrupted';
  return run.status;
}

export function readAgentJournal(demo = false): { runs: PulseAgentRun[]; error: string } {
  const key = agentJournalKey(demo);
  let saved: PulseAgentRun[] = [];
  let error = '';
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) saved = z.array(runSchema).parse(JSON.parse(raw));
  } catch {
    error = 'Журнал в браузере недоступен. Сохранённые данные не перезаписаны; новые результаты доступны до закрытия вкладки.';
  }
  const pending = unsaved.get(key) ?? [];
  if (pending.length && !error) error = 'Часть журнала не сохранена. Результаты доступны в этой вкладке; проверьте свободное место и повторите сохранение.';
  const merged = new Map(saved.map(run => [run.id, run]));
  pending.forEach(run => merged.set(run.id, run));
  return { runs: [...merged.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, MAX_RUNS), error };
}

function writeRun(run: PulseAgentRun, demo: boolean) {
  const key = agentJournalKey(demo);
  const previous = unsaved.get(key) ?? [];
  unsaved.set(key, [run, ...previous.filter(item => item.id !== run.id)].slice(0, MAX_RUNS));
  persistAgentJournal(demo);
}

export function persistAgentJournal(demo = false) {
  const key = agentJournalKey(demo);
  try {
    // Validate the existing file before overwriting it, including after a quota error.
    const raw = localStorage.getItem(key);
    if (raw !== null) z.array(runSchema).parse(JSON.parse(raw));
    localStorage.setItem(key, JSON.stringify(readAgentJournal(demo).runs));
    unsaved.delete(key);
  } catch { /* Retain the result in this tab and expose the persistence error. */ }
  window.dispatchEvent(new CustomEvent(AGENT_ACTIVITY_EVENT, { detail: key }));
}

export function agentResultSummary(action: PulseAgentAction, result: PulseAgentResult): string {
  if (action === 'brief') return (result as PulseAgentBrief).callGoal;
  if (action === 'suggest_next') return (result as PulseAgentNextAction).action;
  const facts = result as PulseAgentFacts;
  return [facts.budget && `Бюджет: ${facts.budget}`, facts.timeline && `Срок: ${facts.timeline}`, `${facts.keyFacts.length} фактов · ${facts.objections.length} возражений`].filter(Boolean).join(' · ');
}

/** Record a real local rule pass only after the corresponding CRM save succeeded. */
export function recordConversationAnalysis(client: Pick<BusinessPulseClient, 'id' | 'name' | 'updatedAt'>, snapshot: ConversationSnapshot, demo = false) {
  const at = new Date().toISOString();
  const a = snapshot.analysis;
  writeRun({ id: crypto.randomUUID(), action: 'extract_facts', clientId: client.id, clientName: client.name, clientUpdatedAt: client.updatedAt,
    startedAt: at, finishedAt: at, status: 'completed', summary: `Сохранён разбор касания · ${temperatureMeta[a.temperature].label}${snapshot.reviewed ? ' · исправлено менеджером' : ' · локальные правила'}`,
    result: { budget: null, decisionMaker: null, timeline: null, competitors: [], objections: a.objection ? [a.objection] : [], keyFacts: [a.pain && `Боль: ${a.pain}`, a.desire && `Желание: ${a.desire}`, a.needsClarification && 'Трактовку нужно уточнить'].filter(Boolean) as string[], source: 'heuristic' },
  }, demo);
}

export async function runPulseAgent(action: PulseAgentAction, client: BusinessPulseClient, options: { demo?: boolean; signal?: AbortSignal; mode?: 'rules' | 'configured' } = {}) {
  const demo = options.demo ?? false;
  const run: PulseAgentRun = { id: crypto.randomUUID(), action, clientId: client.id, clientName: client.name, clientUpdatedAt: client.updatedAt, startedAt: new Date().toISOString(), status: 'running', summary: 'Анализирует карточку и историю касаний' };
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 25_000);
  active.add(run.id);
  writeRun(run, demo);
  try {
    const response = await fetch('/api/pulse/agent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, client, mode: options.mode }), signal: controller.signal,
    });
    const json = await response.json();
    if (controller.signal.aborted) throw new Error('cancelled');
    if (!response.ok || !json.success) throw new Error('Не удалось получить результат. Попробуйте ещё раз.');
    const parsed = resultSchemas[action].safeParse(json.data);
    if (!parsed.success) throw new Error('Ответ помощника неполный. Результат не применён. Повторите анализ.');
    const result = parsed.data;
    const completed: PulseAgentRun = { ...run, status: 'completed', finishedAt: new Date().toISOString(), result, summary: agentResultSummary(action, result) };
    writeRun(completed, demo);
    return result;
  } catch (error) {
    const cancelled = controller.signal.aborted && !timedOut;
    const message = cancelled ? 'Ожидание остановлено. Результат не применён.' : timedOut ? 'Время ожидания истекло. Проверьте соединение и повторите.' : error instanceof Error ? error.message : 'Не удалось выполнить анализ.';
    writeRun({ ...run, status: cancelled ? 'cancelled' : 'failed', finishedAt: new Date().toISOString(), summary: message }, demo);
    throw new Error(message);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
    active.delete(run.id);
  }
}
