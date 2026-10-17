import { describe, expect, it } from 'vitest';
import { demoPulseClients, getDailyCallsAnalysis, hasInteractionOnDay, localDay, localYesterday, pulseRisk, reachedPulseStage, updatePulseClient } from './business-pulse-workspace';
import { parseStoredBusinessPulseClients } from './business-pulse-data';

describe('Business Pulse workspace', () => {
  const now = new Date('2026-09-05T10:00:00Z');
  it('keeps forward and backward stage events without rewriting earlier history', () => {
    const original = demoPulseClients(now)[0];
    const forward = updatePulseClient(original, { stage: 5 });
    const back = updatePulseClient(forward, { stage: 2 });
    expect(original.events).toHaveLength(0);
    expect(back.events?.map(e => [e.from, e.to])).toEqual([[2, 5], [5, 2]]);
    expect(back.history).toEqual(original.history);
    expect(reachedPulseStage(back, 5)).toBe(true);
  });
  it('does not interpret a closed refusal as passing presentations or negotiation', () => {
    const closed = { ...demoPulseClients(now)[0], stage: 6, events: [] };
    expect(reachedPulseStage(closed, 5)).toBe(false);
    expect(pulseRisk(closed, now.getTime())).toBeNull();
  });
  it('resolves missed commitment when employee records action and a new deadline', () => {
    const client = demoPulseClients(now)[0];
    expect(pulseRisk(client, now.getTime())?.kind).toBe('overdue');
    const updated = updatePulseClient(client, { nextAction: 'Получить решение', nextActionDueAt: '2026-09-06T10:00:00Z' }, 'КП отправлено, получение подтверждено', 'activity', now.toISOString());
    expect(pulseRisk(updated, now.getTime())).toBeNull();
    expect(updated.stage).toBe(client.stage);
    expect(updated.events?.[0].type).toBe('activity');
    expect(updated.history).toHaveLength(1);
    expect(updated.history[0].result).toBe('КП отправлено, получение подтверждено');
    expect(updated.note).toBe('КП отправлено, получение подтверждено');
  });
  it('appends multiple touches to history chronologically', () => {
    const client = demoPulseClients(now)[0];
    const first = updatePulseClient(client, {}, 'Первый звонок: отправили презу', 'activity', '2026-09-01T10:00:00Z');
    const second = updatePulseClient(first, {}, 'Второй звонок: обсудили объём', 'activity', '2026-09-03T10:00:00Z');
    expect(second.history).toHaveLength(2);
    expect(second.history[0].result).toBe('Первый звонок: отправили презу');
    expect(second.history[1].result).toBe('Второй звонок: обсудили объём');
    expect(second.note).toBe('Второй звонок: обсудили объём');
  });
  it('keeps scheduled calls out of alerts even after several days without activity', () => {
    const client = { ...demoPulseClients(now)[0], updatedAt: '2026-08-01T10:00:00Z', nextActionDueAt: '2026-10-01T10:00:00Z' };
    expect(pulseRisk(client, now.getTime())).toBeNull();
  });
  it('round trips events, next steps and repeat-sale linkage', () => {
    const client = { ...updatePulseClient(demoPulseClients(now)[0], { stage: 3 }), parentClientId: 'parent' };
    const restored = parseStoredBusinessPulseClients(JSON.stringify([client]))[0];
    expect(restored.events).toEqual(client.events);
    expect(restored.nextActionDueAt).toBe(client.nextActionDueAt);
    expect(restored.parentClientId).toBe('parent');
  });
  it('rejects out-of-range stages and preserves an intentionally empty array', () => {
    expect(parseStoredBusinessPulseClients('[{"id":"bad","name":"Test","stage":99}]')).toEqual([]);
    expect(parseStoredBusinessPulseClients('[]')).toEqual([]);
  });
  it('uses Qyzylorda day boundary', () => {
    expect(localDay(new Date('2026-09-05T20:00:00Z'))).toBe('2026-09-06');
    expect(localYesterday(new Date('2026-09-05T20:00:00Z'))).toBe('2026-09-05');
  });
  it('correctly detects interaction on day from history and events', () => {
    const client = demoPulseClients(now)[0];
    const withTouch = updatePulseClient(client, {}, 'Касание сегодня', 'activity', '2026-09-07T10:00:00+05:00');
    expect(hasInteractionOnDay(withTouch, '2026-09-07')).toBe(true);
    expect(hasInteractionOnDay(withTouch, '2026-09-06')).toBe(false);
  });
  it('analyzes daily calls and stage progression', () => {
    const c1 = updatePulseClient(demoPulseClients(now)[0], { stage: 3 }, 'Обсудили предложение: перешли на повторный контакт', 'activity', '2026-09-07T11:00:00+05:00');
    const c2 = updatePulseClient(demoPulseClients(now)[1], {}, 'Уточнили статус, ждем решение', 'activity', '2026-09-07T12:00:00+05:00');
    const analysis = getDailyCallsAnalysis([c1, c2], '2026-09-07');
    expect(analysis.totalCalls).toBe(2);
    expect(analysis.advancedCount).toBe(1);
    expect(analysis.sameStageCount).toBe(1);
    expect(analysis.advancedRatePercent).toBe(50);
    expect(analysis.advancedClientIds).toContain(c1.id);
  });
  it('counts touches once across history/events and numbers them across dates', () => {
    let client = demoPulseClients(now)[0];
    client = updatePulseClient(client, {}, 'Первый разговор', 'activity', '2026-09-06T10:00:00+05:00');
    client = updatePulseClient(client, {}, 'Второй разговор', 'activity', '2026-09-07T10:00:00+05:00');
    client = updatePulseClient(client, { stage: 3 }, 'Третий разговор', 'activity', '2026-09-07T11:00:00+05:00');
    client = updatePulseClient(client, { agentComment: 'Уточнение смысла' }, 'Карточка обновлена', 'updated', '2026-09-07T12:00:00+05:00');
    const analysis = getDailyCallsAnalysis([client], '2026-09-07');
    expect(analysis.totalCalls).toBe(2);
    expect(analysis.actions.map(a => a.touchNumber)).toEqual([2, 3]);
    expect(analysis.newClientCount).toBe(0);
    expect(analysis.repeatTouchCount).toBe(2);
    expect(analysis.repeatClientCount).toBe(1);
    expect(parseStoredBusinessPulseClients(JSON.stringify([client]))[0].agentComment).toBe('Уточнение смысла');
  });
  it('does not count a stage change without a contact as a call', () => {
    const client = updatePulseClient(demoPulseClients(now)[0], { stage: 3 }, '', 'stage', '2026-09-07T10:00:00+05:00');
    expect(getDailyCallsAnalysis([client], '2026-09-07').totalCalls).toBe(0);
  });
  it('keeps imported history on a day with a later new event', () => {
    const first = updatePulseClient(demoPulseClients(now)[0], {}, 'Импортированный разговор', 'activity', '2026-09-07T09:00:00+05:00');
    const client = updatePulseClient({ ...first, events: [] }, {}, 'Новый разговор', 'activity', '2026-09-07T11:00:00+05:00');
    const analysis = getDailyCallsAnalysis([client], '2026-09-07');
    expect(analysis.totalCalls).toBe(2);
    expect(analysis.newClientCount).toBe(1);
    expect(analysis.repeatTouchCount).toBe(1);
  });
});
