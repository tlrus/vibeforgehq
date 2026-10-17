"use client";

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowUpRight, Check, Clock3, Play, Square, Workflow } from 'lucide-react';
import type { BusinessPulseClient } from '@/lib/business-pulse-data';
import type { PulseAgentBrief, PulseAgentFacts, PulseAgentNextAction } from '@/lib/pulse-agent';
import { agentRunStatus, persistAgentJournal, pulseAgentRoles, runPulseAgent, type AgentRunStatus, type PulseAgentId, type PulseAgentRun } from '@/lib/pulse-agent-activity';
import { usePulseAgentJournal } from '@/lib/use-pulse-agent-journal';
import { PulseAgentAvatar } from './pulse-agent-avatar';
import styles from './pulse-agent-dashboard.module.css';

const statusLabels: Record<AgentRunStatus, string> = { running: 'В работе', completed: 'Готово', failed: 'Ошибка', cancelled: 'Остановлено', interrupted: 'Нет подтверждения' };
const dateLabel = (at: string) => new Date(at).toLocaleString('ru-RU', { timeZone: 'Asia/Qyzylorda', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function PulseAgentTeamSummary({ demo }: { demo: boolean }) {
  const { runs } = usePulseAgentJournal(demo);
  return <div className={styles.teamSummary}>
    <div className={styles.summaryHeading}><div><span>Команда</span><h2>Агенты проекта</h2></div><a href="#agent-team">Журнал действий ↓</a></div>
    <div className={styles.summaryRoster}>{pulseAgentRoles.map(agent => {
      const last = runs.find(run => run.action === agent.action);
      const state = last ? agentRunStatus(last) : null;
      return <a key={agent.id} href="#agent-team" className={styles.summaryAgent}>
        <PulseAgentAvatar agent={agent.id} small />
        <div><strong>{agent.name}<small>{agent.role}</small></strong><p>{agent.id === 'alfred' ? 'ПК не подключён к CRM' : state === 'running' ? `В работе: ${last!.clientName}` : last ? `${statusLabels[state!]} · ${last.summary}` : 'По запросу · запусков пока нет'}</p></div>
        <span className={styles.summaryDot} data-state={state || 'idle'} />
      </a>;
    })}</div>
  </div>;
}

function RunResult({ run }: { run: PulseAgentRun }) {
  if (!run.result) return null;
  const data = run.result;
  const sections = run.action === 'brief'
    ? [['Досье', (data as PulseAgentBrief).summary], ['Цель звонка', (data as PulseAgentBrief).callGoal], ['Сценарий', (data as PulseAgentBrief).script], ['Вопросы', (data as PulseAgentBrief).suggestedQuestions.join('\n')]]
    : run.action === 'suggest_next'
      ? [['Следующее действие', (data as PulseAgentNextAction).action], ['Предложенный срок', dateLabel((data as PulseAgentNextAction).dueAtIso)], ['Почему', (data as PulseAgentNextAction).reason], ['Черновик сообщения', (data as PulseAgentNextAction).messageDraft]]
      : [['Бюджет', (data as PulseAgentFacts).budget || 'В записи не найден'], ['Контакт / ЛПР — проверить', (data as PulseAgentFacts).decisionMaker || 'Не определён'], ['Сроки', (data as PulseAgentFacts).timeline || 'В записи не найдены'], ['Возражения', (data as PulseAgentFacts).objections.join('\n') || 'Не найдены'], ['Сведения', (data as PulseAgentFacts).keyFacts.join('\n')]];
  return <details className={styles.result}><summary>Посмотреть результат</summary><div>
    <p className={styles.resultNotice}>{data.source === 'heuristic' ? 'Подготовлено встроенными правилами. Шаблонные рекомендации и найденные сведения требуют проверки.' : 'Подготовлено AI по карточке клиента. Проверьте рекомендации перед применением.'} Изменения в сделку автоматически не внесены.</p>
    <dl>{sections.filter(([, value]) => value).map(([title, value]) => <div key={title}><dt>{title}</dt><dd>{value}</dd></div>)}</dl>
  </div></details>;
}

export function PulseAgentDashboard({ clients, demo, onOpenClient }: { clients: BusinessPulseClient[]; demo: boolean; onOpenClient: (client: BusinessPulseClient) => void }) {
  const { runs, error: journalError, ready } = usePulseAgentJournal(demo);
  const [selected, setSelected] = useState<PulseAgentId | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [clientId, setClientId] = useState('');
  const [mode, setMode] = useState<'rules' | 'configured'>('rules');
  const [limit, setLimit] = useState(6);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const role = pulseAgentRoles.find(item => item.id === (selected ?? 'atlas'))!;
  const client = clients.find(item => item.id === clientId);
  const running = runs.filter(item => agentRunStatus(item) === 'running');
  const completed = runs.filter(item => item.status === 'completed');
  const filtered = runs.filter(item => (!selected || pulseAgentRoles.find(agent => agent.id === selected)?.action === item.action) && (filter === 'all' || (filter === 'failed' ? ['failed', 'interrupted'].includes(agentRunStatus(item)) : item.status === filter)));

  const launch = async () => {
    if (!client || !role.action || controller.current) return;
    const request = new AbortController();
    controller.current = request; setBusy(true); setFeedback('');
    try {
      await runPulseAgent(role.action, client, { demo, mode, signal: request.signal });
      setFilter('all'); setLimit(6); setFeedback(`${role.name}: результат готов и появился в журнале.`);
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Не удалось выполнить анализ.'); }
    finally { controller.current = null; setBusy(false); }
  };

  return <section className={styles.panel} id="agent-team" aria-labelledby="agent-team-title">
    <header className={styles.header}>
      <div><span className={styles.eyebrow}><Workflow aria-hidden="true" /> Команда проекта</span><h2 id="agent-team-title">Ваши AI-агенты</h2><p>Кто помогает с клиентами и что уже сделано.</p></div>
      <div className={styles.metrics}><span><strong>{running.length}</strong> в работе</span><span><strong>{completed.length}</strong> завершено</span></div>
    </header>

    <div className={styles.roster} aria-label="Выбрать агента и отфильтровать журнал">
      {pulseAgentRoles.map(agent => {
        const activeRun = running.find(run => run.action === agent.action);
        const last = runs.find(run => run.action === agent.action);
        const state = agent.id === 'alfred' ? 'offline' : activeRun ? 'running' : last && ['failed', 'interrupted'].includes(agentRunStatus(last)) ? 'failed' : 'ready';
        return <button type="button" key={agent.id} disabled={busy} className={styles.agent} style={{ '--agent-color': agent.color } as CSSProperties} aria-pressed={selected === agent.id} onClick={() => { setSelected(current => current === agent.id ? null : agent.id); setLimit(6); }}>
          <div className={styles.agentTop}><PulseAgentAvatar agent={agent.id} /><span className={styles.status} data-state={state}><i />{state === 'offline' ? 'Не подключён' : state === 'running' ? 'В работе' : state === 'failed' ? 'Нужно внимание' : agent.id === 'linza' ? 'При сохранении' : 'По запросу'}</span></div>
          <h3>{agent.name}</h3><span className={styles.role}>{agent.role}</span>
          <p>{activeRun ? `Сейчас: ${activeRun.clientName}` : agent.description}</p>
          <span className={styles.agentFoot}>{agent.id === 'alfred' ? 'Подключение ПК впереди' : last ? `Последний запуск · ${dateLabel(last.startedAt)}` : 'Пока без запусков'}<ArrowUpRight aria-hidden="true" /></span>
        </button>;
      })}
    </div>

    <div className={styles.workbench}>
      <div className={styles.launcher}>
        <div><h3>{role.id === 'alfred' ? 'Альфред ждёт подключения' : `${role.name} · ${role.task}`}</h3><p>{role.id === 'alfred' ? 'Связь с локальным ПК ещё не настроена. Когда она появится, здесь будут его фактические задания и результаты.' : 'Выберите компанию. Результат останется в журнале, чтобы к нему можно было вернуться.'}</p></div>
        {role.action ? <>
          <label className={styles.clientField}><span>Компания для анализа</span><select value={clientId} disabled={busy || clients.length === 0} onChange={event => setClientId(event.target.value)}><option value="">{clients.length ? 'Выберите компанию' : 'Сначала добавьте клиента в CRM'}</option>{clients.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className={styles.launchActions}>
            <div className={styles.mode} role="group" aria-label="Способ анализа"><button type="button" aria-pressed={mode === 'rules'} disabled={busy} onClick={() => setMode('rules')}>По правилам</button><button type="button" aria-pressed={mode === 'configured'} disabled={busy} onClick={() => setMode('configured')}>AI-помощник</button></div>
            <button type="button" className={styles.launchButton} disabled={!client || busy} onClick={launch}><Play aria-hidden="true" /> Запустить</button>
            {busy ? <button type="button" className={styles.stop} onClick={() => controller.current?.abort()}><Square aria-hidden="true" /> Остановить ожидание</button> : null}
          </div>
          <small>{busy ? 'Можно прекратить ожидание. Уже принятый сервером запрос может завершиться отдельно.' : mode === 'rules' ? 'Встроенные правила · без запросов к AI-модели' : 'Используется настроенная модель; возможен расход API. При недоступности — встроенные правила.'}</small>
        </> : null}
        {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
      </div>

      <div className={styles.journal}>
        <div className={styles.journalHeader}><div><h3>Журнал действий {selected ? `· ${role.name}` : ''}</h3><span>{filtered.length} записей · время Астаны</span></div><div className={styles.filters} role="group" aria-label="Состояние запусков">{([['all', 'Все'], ['completed', 'Готово'], ['failed', 'Ошибки']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setLimit(6); }}>{label}</button>)}</div></div>
        {journalError ? <div className={styles.error} role="alert">{journalError}<button type="button" onClick={() => persistAgentJournal(demo)}>Повторить сохранение</button></div> : null}
        {!ready ? <p className={styles.empty}>Загружаем журнал агентов…</p> : filtered.length === 0 ? <div className={styles.empty}><Clock3 aria-hidden="true" /><h4>{runs.length && (selected || filter !== 'all') ? 'Под этот фильтр записей нет' : 'Первое действие появится здесь'}</h4><p>{selected === 'alfred' ? 'События с ПК начнут поступать после подключения Альфреда.' : 'Запустите анализ компании здесь или воспользуйтесь помощником в карточке клиента.'}</p>{selected || filter !== 'all' ? <button type="button" onClick={() => { setSelected(null); setFilter('all'); }}>Показать всех агентов</button> : null}</div> : <ol className={styles.entries}>
          {filtered.slice(0, limit).map(run => {
            const agent = pulseAgentRoles.find(item => item.action === run.action)!;
            const state = agentRunStatus(run);
            const company = clients.find(item => item.id === run.clientId);
            return <li key={run.id}>
              <PulseAgentAvatar agent={agent.id} small />
              <div className={styles.entryBody}>
                <div className={styles.entryTitle}><strong>{agent.name} <span>· {agent.task}</span></strong><time dateTime={run.startedAt}>{dateLabel(run.startedAt)}</time></div>
                {company ? <button type="button" className={styles.company} onClick={() => onOpenClient(company)}>{run.clientName}<ArrowUpRight aria-hidden="true" /></button> : <span className={styles.missingClient}>{run.clientName} · карточка недоступна</span>}
                <p>{state === 'interrupted' ? 'Нет подтверждения завершения. Вкладка могла быть закрыта или соединение прервано.' : run.summary}</p>
                <div className={styles.entryMeta}><span data-state={state}>{state === 'completed' ? <Check aria-hidden="true" /> : <i />} {statusLabels[state]}</span>{run.result ? <span>{run.result.source === 'openai' ? 'AI-модель' : 'Встроенные правила'}</span> : null}{company && company.updatedAt !== run.clientUpdatedAt && run.result ? <span>Карточка изменена после анализа</span> : null}</div>
                <RunResult run={run} />
              </div>
            </li>;
          })}
        </ol>}
        {filtered.length > limit ? <button type="button" className={styles.showMore} onClick={() => setLimit(current => current + 10)}>Показать ещё {Math.min(10, filtered.length - limit)}</button> : null}
      </div>
    </div>
    <footer className={styles.footer}><span>Три роли встроенного Pulse Agent</span><span>{demo ? 'Демо-журнал' : 'Журнал этого браузера'} · последние 100 запусков · сообщения клиентам не отправляются</span></footer>
  </section>;
}
