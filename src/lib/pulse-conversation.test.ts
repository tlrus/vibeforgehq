import { describe, expect, it } from 'vitest';
import { analyzeConversation, businessDay, clientConversation, clientResponseSummary, emptyConversation, makeConversation, normalizeSource, pendingAction, todayWork, parseConversation } from './pulse-conversation';
import { demoPulseClients, updatePulseClient, getDailyCallsAnalysis } from './business-pulse-workspace';
import { parseStoredBusinessPulseClients } from './business-pulse-data';
const now = new Date('2026-09-10T06:00:00Z');
const base = () => ({ ...demoPulseClients(now)[7], nextAction: '', nextActionDueAt: '', note: '' });
const input = (response: string) => ({ ...emptyConversation, response });
describe('conversation rules', () => {
  it.each([['с базы', 'База'], ['из таблицы', 'База'], ['знакомый порекомендовал', 'Рекомендация'], ['наш 2гис', '2ГИС'], ['выставка', 'выставка']])('normalizes source %s conservatively', (raw, expected) => expect(normalizeSource(raw)).toBe(expected));
  it('keeps a refusal cold without closing the pipeline', () => {
    expect(analyzeConversation(input('не хочет'))).toMatchObject({ temperature: 'cold', objection: 'Не хочет / нет интереса', stopContact: false });
  });
  it('tracks reported warming after an initial objection', () => {
    expect(analyzeConversation({ ...input('Сначала не хочет'), managerWords: 'Показал пример, клиент потеплел' })).toMatchObject({ temperature: 'warm', usefulPhrase: 'Показал пример, клиент потеплел' });
  });
  it('does not invent warming from a negation', () => expect(analyzeConversation({ ...input('не хочет'), managerWords: 'Клиент не потеплел' }).temperature).toBe('cold'));
  it('keeps contradictory responses uncertain', () => expect(analyzeConversation(input('Не хочу, но готов купить'))).toMatchObject({ temperature: 'unknown', needsClarification: true }));
  it('extracts a budget pain and stated desire, not an industry persona', () => expect(analyzeConversation(input('Дорого. Хотим увеличить продажи.'))).toMatchObject({ objection: 'Цена / бюджет', pain: 'Стоимость не подходит', desire: 'Хотим увеличить продажи' }));
  it('does not treat not expensive as a price objection', () => expect(analyzeConversation(input('это не дорого')).objection).toBe(''));
  it('respects explicit no-contact requests', () => expect(analyzeConversation(input('Не звоните мне'))).toMatchObject({ temperature: 'cold', stopContact: true }));
  it.each(['отправил презу', 'КП отправлено', 'не отправлять презу'])('does not turn completed/prohibited %s into a task', text => expect(pendingAction(text)).toBe(''));
  it.each(['отправить презу', 'оптравить презу', 'пришлите презентацию'])('keeps planned %s pending', text => expect(pendingAction(text)).toBe('Отправить презентацию / материалы'));
  it('preserves raw text and reviewed interpretations through storage', () => {
    const snapshot = makeConversation(input('не хочет'), { objection: 'Не подходит формат', temperature: 'cold' });
    const saved = updatePulseClient(base(), { sourceRaw: 'с базы', source: 'База', conversation: snapshot }, 'Клиент: не хочет', 'activity', now.toISOString());
    const loaded = parseStoredBusinessPulseClients(JSON.stringify([saved]))[0];
    expect(loaded.conversation).toEqual(snapshot);
    expect(loaded.history[0].conversation).toEqual(snapshot);
    expect(loaded.sourceRaw).toBe('с базы');
    expect(getDailyCallsAnalysis([loaded], businessDay(now)).totalCalls).toBe(1);
  });
  it('ignores malformed optional analysis without discarding the client', () => {
    expect(parseConversation({ version: 1, input: {}, analysis: {} })).toBeUndefined();
    const restored = parseStoredBusinessPulseClients(JSON.stringify([{ ...base(), conversation: { version: 1 } }]));
    expect(restored).toHaveLength(1); expect(restored[0].conversation).toBeUndefined();
  });
  it('can derive provisional legacy context without mutating it', () => {
    const legacy = { ...base(), note: 'не хочет' }; expect(clientConversation(legacy).analysis.temperature).toBe('cold'); expect(legacy).not.toHaveProperty('conversation');
  });
  it('retains earlier pains and their source after a later delivery confirmation', () => {
    const first = updatePulseClient(base(), { conversation: makeConversation(input('Теряются заявки. Хотим больше продаж.')) }, 'Разговор', 'activity', now.toISOString());
    const second = updatePulseClient(first, { conversation: makeConversation(input('Готов купить')) }, 'Продолжили', 'activity', now.toISOString());
    expect(clientResponseSummary(second).analysis).toMatchObject({ temperature:'hot', pain:'Теряются заявки', desire:'Хотим больше продаж' });
    expect(clientResponseSummary(second).evidence.find(e => e.key==='pain')?.quote).toBe('Теряются заявки. Хотим больше продаж.');
  });
});
describe('today obligations and first calls', () => {
  it('separates today/overdue/undated and excludes future/closed/completed', () => {
    const clients = ['2026-09-10T10:00:00+05:00','2026-09-09T10:00:00+05:00','','2026-09-11T10:00:00+05:00'].map((due,i) => ({ ...base(), id: String(i), nextAction: 'Отправить КП', nextActionDueAt: due }));
    clients.push({ ...base(), id:'closed', stage:6, nextAction:'Отправить КП', nextActionDueAt:'' });
    expect(todayWork(clients, now).tasks.map(t => t.state)).toEqual(['overdue','today','unscheduled']);
    expect(todayWork([{ ...base(), note:'отправить презу', nextActionDismissed:true }],now).tasks).toHaveLength(0);
  });
  it('counts one first call, not messages, repeat calls or duplicated events', () => {
    let c = updatePulseClient(base(), { conversation: makeConversation({ ...input('Здравствуйте'), kind:'message' }) }, 'Сообщение', 'activity', now.toISOString());
    expect(todayWork([c], now).firstCalls).toBe(0);
    c = updatePulseClient(c, { conversation: makeConversation(input('Позвонили')) }, 'Звонок', 'activity', now.toISOString());
    c = updatePulseClient(c, { conversation: makeConversation(input('Ещё звонок')) }, 'Ещё звонок', 'activity', now.toISOString());
    expect(todayWork([c],now)).toMatchObject({ firstCalls:1, remaining:29 });
    expect(todayWork([c],new Date('2026-09-11T06:00:00Z')).firstCalls).toBe(0);
  });
  it('uses business timezone at midnight and excludes opted-out new leads', () => {
    expect(businessDay(new Date('2026-09-09T20:00:00Z'))).toBe('2026-09-10');
    expect(todayWork([{ ...base(), conversation: makeConversation(input('Не пишите мне')) }],now).newCandidates).toHaveLength(0);
  });
});
