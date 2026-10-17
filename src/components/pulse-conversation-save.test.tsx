import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ManualBusinessPulse } from './manual-business-pulse';
import type { BusinessPulseClient } from '@/lib/business-pulse-data';
const state = vi.hoisted(() => ({ clients: [] as BusinessPulseClient[], saved: [] as BusinessPulseClient[], fail: false, query: new URLSearchParams('create=1') }));
vi.mock('@/lib/use-pulse-workspace', () => ({ usePulseWorkspace: () => ({ clients: state.clients, hydrated: true, error: '', demo: true, exportBackup: vi.fn(), setClients: (update: (c: BusinessPulseClient[]) => BusinessPulseClient[]) => { if (state.fail) return false; state.saved = update(state.clients); return true; } }) }));
vi.mock('@/lib/use-pulse-navigation', () => ({ usePulseNavigation: () => ({ query: state.query, navigate: vi.fn() }) }));
vi.mock('./pulse-agent-dashboard', () => ({ PulseAgentDashboard: () => null, PulseAgentTeamSummary: () => null }));
vi.mock('./pulse-agent-panel', () => ({ PulseAgentPanel: () => null }));
vi.mock('./manual-business-flow', () => ({ ManualBusinessFlow: () => null }));
vi.mock('@/lib/pulse-agent-activity', () => ({ recordConversationAnalysis: vi.fn() }));
vi.mock('./pulse-dialog', () => ({ PulseDialog: ({children}: {children: React.ReactNode}) => <div role="dialog">{children}</div> }));
beforeEach(() => { state.clients=[]; state.saved=[]; state.fail=false; });
afterEach(cleanup);
function start() { render(<ManualBusinessPulse />); fireEvent.click(screen.getByRole('button',{name:'Добавить'})); fireEvent.change(screen.getByRole('textbox',{name:'Компания *'}),{target:{value:'Тестовая компания'}}); }
it('saves raw source, customer response, classification and explicit deadline together', () => {
  start(); fireEvent.change(screen.getByRole('textbox',{name:/Откуда клиент/}),{target:{value:'с базы'}});
  fireEvent.change(screen.getByRole('textbox',{name:'Что ответил клиент'}),{target:{value:'не хочет'}});
  fireEvent.change(screen.getByRole('textbox',{name:'Что обещали / о чём договорились'}),{target:{value:'Отправить презу'}});
  fireEvent.change(screen.getByLabelText(/Срок договорённости/),{target:{value:'2026-09-10T16:00'}});
  fireEvent.click(screen.getByRole('button',{name:'Сохранить'}));
  expect(state.saved[0]).toMatchObject({ source:'База', sourceRaw:'с базы', stage:1, nextAction:'Отправить презу', conversation:{ analysis:{temperature:'cold',objection:'Не хочет / нет интереса'}, input:{response:'не хочет',kind:'call'} } });
  expect(state.saved[0].nextActionDueAt).toBe(new Date('2026-09-10T16:00').toISOString());
  expect(state.saved[0].history).toHaveLength(1);
});
it('does not turn a promise-only card edit into a call', () => {
  start(); fireEvent.change(screen.getByRole('textbox',{name:'Что обещали / о чём договорились'}),{target:{value:'Отправить КП'}});
  fireEvent.click(screen.getByRole('button',{name:'Сохранить'}));
  expect(state.saved[0].history).toHaveLength(0); expect(state.saved[0].nextAction).toBe('Отправить КП');
});
it('preserves user input if browser storage rejects saving', () => {
  start(); state.fail=true;
  fireEvent.change(screen.getByRole('textbox',{name:'Что ответил клиент'}),{target:{value:'Хочу посмотреть'}});
  fireEvent.click(screen.getByRole('button',{name:'Сохранить'}));
  expect(screen.getByRole('textbox',{name:'Что ответил клиент'})).toHaveValue('Хочу посмотреть');
});
it('lets the manager correct classification before a message is saved', () => {
  start(); fireEvent.change(screen.getByRole('textbox',{name:'Что ответил клиент'}),{target:{value:'не хочет'}});
  fireEvent.change(screen.getByRole('combobox',{name:'Как общались'}),{target:{value:'message'}});
  fireEvent.click(screen.getByText('Исправить трактовку'));
  fireEvent.change(screen.getByRole('combobox',{name:'Интерес клиента'}),{target:{value:'warm'}});
  fireEvent.click(screen.getByRole('button',{name:'Сохранить'}));
  expect(state.saved[0].conversation).toMatchObject({ reviewed:true, input:{kind:'message'}, analysis:{temperature:'warm'} });
  expect(state.saved[0].history[0].channel).toBe('Сообщение');
});
