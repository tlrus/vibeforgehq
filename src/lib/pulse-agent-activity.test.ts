import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { agentJournalKey, agentRunStatus, readAgentJournal, runPulseAgent } from './pulse-agent-activity';
import type { BusinessPulseClient } from './business-pulse-data';

const client: BusinessPulseClient = { id: 'test-agent-company', name: 'Тестовая компания', contact: '', phone: '', product: 'other', source: '', manager: '', stage: 1, value: 0, note: '', waitingForBusiness: true, history: [], createdAt: '2026-09-09T08:00:00Z', updatedAt: '2026-09-09T08:00:00Z' };
const result = { summary: 'Клиент изучает предложение', keyPains: [], callGoal: 'Уточнить задачу', talkingPoints: [], script: 'Добрый день', suggestedQuestions: [], objectionTips: [], source: 'heuristic' };
beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Agent activity journal', () => {
  it('records actual start and result, isolates demo and survives a fresh read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      expect(readAgentJournal(true).runs[0].status).toBe('running');
      expect(readAgentJournal(false).runs).toHaveLength(0);
      return { ok: true, json: async () => ({ success: true, data: result }) };
    }));
    await runPulseAgent('brief', client, { demo: true, mode: 'rules' });
    const stored = JSON.parse(localStorage.getItem(agentJournalKey(true))!);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ clientId: client.id, status: 'completed', summary: result.callGoal, result });
    expect(readAgentJournal(false).runs).toHaveLength(0);
  });

  it('records failures without fabricating a completed result', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ success: false }) })));
    await expect(runPulseAgent('brief', client)).rejects.toThrow();
    expect(readAgentJournal().runs[0]).toMatchObject({ status: 'failed' });
    expect(readAgentJournal().runs[0].result).toBeUndefined();
  });

  it('rejects malformed results before showing success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ success: true, data: { summary: 'broken' } }) })));
    await expect(runPulseAgent('brief', client)).rejects.toThrow('неполный');
    expect(readAgentJournal().runs[0].status).toBe('failed');
  });

  it('records cancellation and never accepts a late response', async () => {
    const controller = new AbortController();
    vi.stubGlobal('fetch', vi.fn(async () => { controller.abort(); return { ok: true, json: async () => ({ success: true, data: result }) }; }));
    await expect(runPulseAgent('brief', client, { signal: controller.signal })).rejects.toThrow('Ожидание остановлено');
    expect(readAgentJournal().runs[0].status).toBe('cancelled');
  });

  it('marks orphaned runs unconfirmed instead of inventing completion', () => {
    expect(agentRunStatus({ id: 'orphan', action: 'brief', clientId: client.id, clientName: client.name, clientUpdatedAt: client.updatedAt, startedAt: '2026-09-09T08:00:00Z', status: 'running', summary: 'Running' }, Date.parse('2026-09-09T08:02:00Z'))).toBe('interrupted');
  });

  it('does not overwrite a corrupt journal and reports the limitation', async () => {
    localStorage.setItem(agentJournalKey(true), '{broken');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ success: true, data: result }) })));
    await runPulseAgent('brief', client, { demo: true });
    expect(localStorage.getItem(agentJournalKey(true))).toBe('{broken');
    expect(readAgentJournal(true).error).toContain('не перезаписаны');
    expect(readAgentJournal(true).runs[0].status).toBe('completed');
  });
});
