"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowLeft,
  Bot,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleAlert,
  Goal,
  ListChecks,
  MessageCircle,
  Phone,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import styles from "@/app/pilot/manager/manager.module.css";
import {
  businessPulseStages,
  nextActionForClient,
  type BusinessPulseClient,
} from "@/lib/business-pulse-data";
import { clientConversation, emptyConversation, makeConversation, temperatureMeta, type ConversationInput } from '@/lib/pulse-conversation';
import { recordConversationAnalysis } from '@/lib/pulse-agent-activity';
import { usePulseWorkspace } from '@/lib/use-pulse-workspace';
import { usePulseNavigation } from '@/lib/use-pulse-navigation';
import { localDay, pulseRisk, updatePulseClient } from '@/lib/business-pulse-workspace';
import { PulseDialog } from './pulse-dialog';
import workspaceStyles from '@/app/business-pulse/manual-pulse.module.css';

type ManagerView = "today" | "workflow" | "results";

type ManagerTask = {
  id: string;
  client: BusinessPulseClient;
  action: string;
  priority: "Сейчас" | "Высокий" | "План";
  context: string;
  insight: string;
  script: string;
};

function taskContext(client: BusinessPulseClient) {
  const latest = client.history.at(-1);
  if (!latest) return client.note || "Контекст будет уточнён после следующего контакта.";
  return [
    latest.result && `Результат: ${latest.result}`,
    latest.achieved && `Получилось: ${latest.achieved}`,
    latest.difficulty && `Сложность: ${latest.difficulty}`,
    latest.pain && `Боль: ${latest.pain}`,
    latest.details.length && `Дополнительно: ${latest.details.join(" · ")}`,
  ].filter(Boolean).join(". ") || client.note;
}

function taskInsight(client: BusinessPulseClient) {
  if (client.stage >= 4) return "Контакт уже дошёл до встречи или переговоров. Зафиксируйте конкретную договорённость, ответственного и срок.";
  if (client.stage === 3) return "В журнале есть обещание вернуться к разговору. Продолжите с прежней договорённости, не начинайте знакомство заново.";
  if (client.stage === 2) return "Материалы уже обсуждались или были отправлены. Следующий контакт должен проверить реакцию и вывести к встрече.";
  return "Сначала уточните роль собеседника и текущий процесс продаж, затем предложите один понятный следующий шаг.";
}

function taskScript(client: BusinessPulseClient, action: string) {
  const contact = client.contact ? `, ${client.contact.split(/[\s-]/)[0]}` : "";
  if (/през|видео|сайт|письм/i.test(action)) return `Здравствуйте${contact}! Как договаривались, направляю короткие материалы по Business Pulse. После просмотра предлагаю созвониться на 15 минут и разобрать ваш процесс на одном примере.`;
  if (/встреч|демо|онлайн/i.test(action)) return `Здравствуйте${contact}! Возвращаюсь к нашей договорённости по Business Pulse. Давайте закрепим время короткой демонстрации: покажу путь клиента и контроль следующего действия на вашем сценарии.`;
  if (/перезвон|позвон|набрать|написать|напомн/i.test(action)) return `Здравствуйте${contact}! Возвращаюсь к нашей договорённости. Подскажите, удобно сейчас коротко обсудить, где в вашем процессе теряются ответы, обещания или следующие шаги?`;
  return `Здравствуйте${contact}! Хочу продолжить наш разговор о Business Pulse. Предлагаю за 15 минут разобрать один реальный клиентский процесс и понять, есть ли для вас практическая польза.`;
}

function buildTasks(clients: BusinessPulseClient[]): ManagerTask[] {
  return clients
    .filter((client) => client.stage < 6 && client.waitingForBusiness && !clientConversation(client).analysis.stopContact)
    .sort((left, right) => Number(!!pulseRisk(right)) - Number(!!pulseRisk(left)) || (Date.parse(left.nextActionDueAt || '') || Infinity) - (Date.parse(right.nextActionDueAt || '') || Infinity) || right.stage - left.stage || left.updatedAt.localeCompare(right.updatedAt))
    .map((client) => {
      const action = nextActionForClient(client);
      return {
        id: client.id,
        client,
        action,
        priority: client.stage >= 4 ? "Сейчас" : client.stage >= 2 ? "Высокий" : "План",
        context: taskContext(client),
        insight: taskInsight(client),
        script: taskScript(client, action),
      };
    });
}

function TaskIcon({ task }: { task: ManagerTask }) {
  return /през|напис|ватсап|письм/i.test(task.action) ? <MessageCircle /> : task.client.stage >= 4 ? <Target /> : <Phone />;
}

export function BusinessPulseManager() {
  const { clients, setClients, hydrated, error: storageError, demo } = usePulseWorkspace();
  const { query, navigate } = usePulseNavigation();
  const view: ManagerView = query.get('view') === 'workflow' ? 'workflow' : query.get('view') === 'results' ? 'results' : 'today';
  const setView = (value: ManagerView) => navigate({ view: value });
  const selectedId = query.get('task') ?? '';
  const setSelectedId = (id: string) => navigate({ task: id });
  const [announcement, setAnnouncement] = useState("");
  const [completionId, setCompletionId] = useState<string | null>(null);
  const [result, setResult] = useState('');
  const [contactKind, setContactKind] = useState<ConversationInput['kind']>('call');
  const [nextStep, setNextStep] = useState('');
  const [deadline, setDeadline] = useState('');
  const [queueSearch, setQueueSearch] = useState('');
  const completionClient = clients.find(c => c.id === completionId);
  const returnTo = query.get('from');
  const backHref = returnTo && /^\/business-pulse(?:\?|$)/.test(returnTo) ? returnTo : `/business-pulse${demo ? '?demo=1' : ''}`;
  const crmHref = (id?: string) => `/business-pulse?${new URLSearchParams({ view: 'crm', returnTo: `/business-pulse/manager?${query}`, ...(id ? { client: id } : {}), ...(demo ? { demo: '1' } : {}) })}`;

  const tasks = useMemo(() => buildTasks(clients), [clients]);
  const visibleTasks = tasks.filter(task => `${task.client.name} ${task.action}`.toLowerCase().includes(queueSearch.toLowerCase()));
  const currentTask = tasks.find((task) => task.id === selectedId) ?? tasks[0];
  const activities = clients.reduce((sum, client) => sum + client.history.length + (client.events ?? []).filter(e => e.type === 'activity').length, 0);
  const presentations = clients.filter((client) => client.stage >= 2 && client.stage < 6).length;
  const meetings = clients.filter((client) => client.stage >= 4 && client.stage < 6).length;
  const closed = clients.filter((client) => client.stage === 6).length;
  const progress = activities ? Math.round((presentations / clients.length) * 100) : 0;
  const dailyActivity = Array.from(new Set(clients.flatMap((client) => client.history.map((entry) => entry.date))))
    .sort()
    .map((date) => ({
      date,
      count: clients.reduce((sum, client) => sum + client.history.filter((entry) => entry.date === date).length, 0),
    }));
  const maxDailyActivity = Math.max(1, ...dailyActivity.map((item) => item.count));

  const completeTask = (id: string) => { setCompletionId(id); setResult(''); setNextStep(''); setDeadline(''); };
  const completedToday = clients.reduce((sum, c) => sum + (c.events ?? []).filter(e => e.type === 'activity' && localDay(new Date(e.at)) === localDay()).length, 0);

  return (
    <div className={`${styles.canvas} ${workspaceStyles.managerWorkspace}`}>
      <header className={styles.appHeader}>
        <Link className={styles.identity} href={backHref} aria-label="Назад в Business Pulse">
          <span><ArrowLeft /></span>
          <div><strong>Business Pulse</strong><small>КАБИНЕТ МЕНЕДЖЕРА</small></div>
        </Link>
        <nav aria-label="Разделы кабинета менеджера">
          <button className={view === "today" ? styles.activeNav : ""} onClick={() => setView("today")}><Activity /> Сегодня</button>
          <button className={view === "workflow" ? styles.activeNav : ""} onClick={() => setView("workflow")}><ListChecks /> Поток <b>{tasks.length}</b></button>
          <button className={view === "results" ? styles.activeNav : ""} onClick={() => setView("results")}><Goal /> Результат</button>
        </nav>
        <div className={styles.headerProfile}>
          <span>BP</span><div><strong>Менеджер BP</strong><small>Астана · журнал активности</small></div><em><TrendingUp /> {activities} касаний</em>
        </div>
      </header>
      <div className={workspaceStyles.workspaceBar}><Link href={view === 'today' ? backHref : `/business-pulse/manager?${new URLSearchParams({ ...(demo ? { demo: '1' } : {}), ...(returnTo ? { from: returnTo } : {}) })}`}><ArrowLeft /> {view === 'today' ? 'Назад в Business Pulse' : 'К моему дню'}</Link><span>{demo ? 'Демонстрация · вымышленные компании' : 'Единая база этого браузера'}</span></div>
      {storageError ? <p role="alert" className={workspaceStyles.feedback}>{storageError}</p> : null}

      <p className={styles.srOnly} aria-live="polite">{announcement || (hydrated ? 'Кабинет менеджера готов к работе' : 'Загружаем кабинет менеджера')}</p>

      {view === "today" ? (
        <main className={styles.main}>
          <section className={styles.welcome}>
            <div><span><Sparkles /> Рабочий день под контролем</span><h1>Следующий шаг уже выбран</h1><p>Сначала просроченные обещания, затем ближайшие сроки и переговоры. Результат каждого контакта сохраняется в общей истории.</p></div>
            <button onClick={() => setView("workflow")}><ListChecks /> Весь поток <b>{tasks.length}</b><ArrowRight /></button>
          </section>

          <section className={styles.commandGrid} aria-label="Главный экран менеджера">
            <aside className={styles.performanceCard}>
              <header><span>Мои показатели</span><strong>Журнал актуализирован</strong></header>
              <div className={styles.salesAmount}><small>Обработано компаний</small><strong>{clients.length}</strong><div><i style={{ width: `${progress}%` }} /></div><span>{progress}% дошли до презентации или дальше</span></div>
              <dl className={styles.metricList}>
                <div><dt><Phone /> Касания</dt><dd>{activities}</dd><small>звонки и сообщения</small></div>
                <div><dt><MessageCircle /> Презентации</dt><dd>{presentations}</dd><small>активные контакты</small></div>
                <div><dt><Target /> Встречи</dt><dd>{meetings}</dd><small>и переговоры</small></div>
              </dl>
              <div className={styles.incomeStrip}><span><CircleAlert /><small>Требуют шага</small></span><strong>{tasks.length}</strong><button onClick={() => setView("workflow")}>Открыть очередь</button></div>
            </aside>

            <section className={styles.aiFocus}>
              {currentTask ? (
                <>
                  <header><span><Bot /> Следующий шаг по журналу</span><em>{currentTask.priority}</em></header>
                  <div className={styles.clientFocus}><div><small>{temperatureMeta[clientConversation(currentTask.client).analysis.temperature].label} · {businessPulseStages[currentTask.client.stage].label}</small><h2>{currentTask.client.name}</h2><p>{currentTask.action}</p></div><strong>{currentTask.client.history.length || 1} кас.</strong></div>
                  <div className={styles.signalRow}><span>{currentTask.client.contact || "ЛПР не уточнён"}</span><span>{currentTask.client.source}</span><span>{currentTask.priority}</span></div>
                  <div className={styles.aiReason}><Sparkles /><div><strong>Почему сейчас</strong><p>{currentTask.insight}</p></div></div>
                  <div className={styles.script}><small>Формулировка для контакта</small><blockquote>«{currentTask.script}»</blockquote><span>{currentTask.context}</span></div>
                  <div className={styles.focusActions}><Link className={styles.secondaryAction} href={crmHref(currentTask.id)}><BriefcaseBusiness /> Карточка клиента</Link><button className={styles.primaryAction} onClick={() => completeTask(currentTask.id)}><Check /> Записать результат</button></div>
                </>
              ) : <div className={styles.dayComplete}><Check /><h2>Поток закрыт</h2><p>Все активные следующие шаги обработаны.</p></div>}
            </section>

            <aside className={styles.toolsCard}>
              <header><span>Рабочий контур</span><small>Одни данные во всех разделах</small></header>
              <div className={styles.toolGrid}>
                <Link href={crmHref()}><BriefcaseBusiness /><span><strong>CRM</strong><small>{clients.length} компаний</small></span><ArrowRight /></Link>
                <button onClick={() => setView("workflow")}><MessageCircle /><span><strong>Очередь</strong><small>{tasks.length} требуют шага</small></span><ArrowRight /></button>
                <button onClick={() => setView("results")}><TrendingUp /><span><strong>Результат</strong><small>{presentations} после презентации</small></span><ArrowRight /></button>
                <button onClick={() => setView("workflow")}><UserRound /><span><strong>Контакты</strong><small>{meetings} тёплых</small></span><ArrowRight /></button>
              </div>
              <div className={styles.dailyProgress}><span><TrendingUp /><small>Контактов за сегодня</small></span><strong>{completedToday}</strong><div><i style={{ width: `${completedToday + tasks.length ? completedToday / (completedToday + tasks.length) * 100 : 0}%` }} /></div></div>
            </aside>
          </section>
        </main>
      ) : null}

      {view === "workflow" ? (
        <main className={`${styles.main} ${styles.workflowMain}`}>
          <section className={styles.sectionHeading}>
            <div><span><ListChecks /> Поток задач</span><h1>Продолжайте с места прошлого разговора</h1><p>Каждая задача опирается на последний результат и сохранённый контекст из журнала.</p></div>
            <div className={styles.flowProgress}><strong>{completedToday}</strong><span>контактов сегодня</span><i /><b>{tasks.length} в очереди</b></div>
          </section>
          <section className={styles.workflowGrid}>
            <aside className={styles.queuePanel}>
              <header><div><strong>Очередь по журналу</strong><small>Сначала встречи и переговоры</small></div><span>{tasks.length}</span></header>
              <div className={styles.taskQueue} aria-label="Очередь задач менеджера">
                <label className={workspaceStyles.queueSearch}>Поиск в очереди<input type="search" value={queueSearch} onChange={e => setQueueSearch(e.target.value)} placeholder="Компания или действие" /></label>
                {!visibleTasks.length ? <p>Задач по этим условиям нет.</p> : null}
                {visibleTasks.map((task, index) => (
                  <button key={task.id} className={currentTask?.id === task.id ? styles.selectedTask : ""} onClick={() => setSelectedId(task.id)}>
                    <span className={styles.taskNumber}>{String(index + 1).padStart(2, "0")}</span><span className={styles.taskKind}><TaskIcon task={task} /></span>
                    <span className={styles.taskText}><strong>{task.client.name}</strong><small>{task.action}</small><em>{temperatureMeta[clientConversation(task.client).analysis.temperature].label} · {businessPulseStages[task.client.stage].label}</em></span>
                    <span className={styles.taskWait}>{task.client.history.length || 1} кас.</span><ChevronRight />
                  </button>
                ))}
              </div>
            </aside>
            <section className={styles.coachPanel}>
              {currentTask ? <><header><span><Bot /> Помощь по выбранной компании</span><em>{currentTask.priority}</em></header><div className={styles.coachClient}><div><small>{currentTask.client.contact || "Контакт не уточнён"}</small><h2>{currentTask.client.name}</h2><p>{currentTask.action}</p></div><strong>{currentTask.client.source}</strong></div><div className={styles.coachContext}><small>Что записано в журнале</small><p>{currentTask.context}</p></div><div className={styles.coachAdvice}><Sparkles /><div><small>Лучший следующий шаг</small><p>{currentTask.insight}</p></div></div><div className={styles.coachScript}><small>Готовая формулировка</small><blockquote>«{currentTask.script}»</blockquote></div><div className={styles.coachActions}><Link href={crmHref(currentTask.id)}>Карточка клиента →</Link><button onClick={() => completeTask(currentTask.id)}><Check /> Записать результат</button></div></> : <div className={styles.dayComplete}><Check /><h2>Поток выполнен</h2><p>Активных задач больше нет.</p></div>}
            </section>
            <aside className={styles.flowLogic}><header><span><Sparkles /> Логика очереди</span><small>Только данные журнала</small></header><ol><li><span><Phone /></span><div><strong>Фиксируем результат</strong><small>Сохраняем смысл разговора</small></div></li><li><span><RotateCcw /></span><div><strong>Определяем продолжение</strong><small>Звонок, сообщение или встреча</small></div></li><li><span><Target /></span><div><strong>Поднимаем тёплых</strong><small>Встречи и переговоры выше</small></div></li><li><span><Bot /></span><div><strong>Готовим формулировку</strong><small>Без автоматической отправки</small></div></li></ol><p>Менеджер сам выполняет действие и фиксирует результат. AI не пишет клиенту автоматически.</p></aside>
          </section>
        </main>
      ) : null}

      {view === "results" ? (
        <main className={`${styles.main} ${styles.goalsMain}`}>
          <section className={styles.sectionHeading}><div><span><TrendingUp /> Результат журнала</span><h1>Видно не только количество звонков</h1><p>Показываем, сколько компаний дошли до содержательного следующего шага.</p></div><div className={styles.currentZone}><small>В работе</small><strong>{clients.length - closed}</strong><span>{closed} закрыто</span></div></section>
          <section className={styles.tierGrid} aria-label="Результаты работы с базой">
            <article className={styles.tierCard}><header><span>Касания</span></header><strong>{activities}</strong><dl><div><dt>Компаний</dt><dd>{clients.length}</dd></div><div><dt>Повторных</dt><dd>{activities - clients.length}</dd></div></dl></article>
            <article className={styles.tierCard}><header><span>Материалы</span></header><strong>{presentations}</strong><dl><div><dt>Доля базы</dt><dd>{progress}%</dd></div><div><dt>Ждут шага</dt><dd>{tasks.length}</dd></div></dl></article>
            <article className={styles.tierCard}><header><span>Тёплые</span></header><strong>{meetings}</strong><dl><div><dt>Встречи / демо</dt><dd>{clients.filter((client) => client.stage === 4).length}</dd></div><div><dt>Переговоры</dt><dd>{clients.filter((client) => client.stage === 5).length}</dd></div></dl></article>
          </section>
          <section className={styles.analyticsGrid}>
            <article className={styles.historyCard}><header><div><span>Активность</span><h2>Касания по дням</h2></div><strong>{dailyActivity.length}<small>рабочих дней</small></strong></header><div className={styles.monthBars}>{dailyActivity.map((item) => <div key={item.date}><span style={{ height: `${Math.max(18, item.count / maxDailyActivity * 100)}%` }}><em>{item.count}</em></span><small>{new Date(`${item.date}T12:00:00+05:00`).toLocaleDateString("ru-RU", { day: "2-digit" })}</small></div>)}</div><footer><span><Activity /> Всего {activities} касаний</span><span>Пик: {maxDailyActivity} за день</span></footer></article>
            <article className={styles.contributionCard}><header><div><span>Качество базы</span><h2>Что требует внимания</h2></div><CircleAlert /></header><div className={styles.contributionValue}><small>Следующих действий</small><strong>{tasks.length}</strong><span>сохранены в очереди менеджера</span></div><div className={styles.companyShare}><span><small>Дошли до встречи или переговоров</small><b>{clients.length ? Math.round(meetings / clients.length * 100) : 0}%</b></span><div><i style={{ width: `${clients.length ? meetings / clients.length * 100 : 0}%` }} /></div><p>{meetings} компаний из {clients.length}</p></div><footer><TrendingUp /><p>Все показатели рассчитаны из приложенного журнала, без выдуманных сумм продаж.</p></footer></article>
          </section>
        </main>
      ) : null}
      {completionClient ? <PulseDialog title="completion-title" onClose={() => setCompletionId(null)}><section className={workspaceStyles.editorSheet}><header><div><span>Результат контакта</span><h2 id="completion-title">{completionClient.name}</h2></div><button onClick={() => setCompletionId(null)} aria-label="Назад к задаче"><ArrowLeft /></button></header><form onSubmit={e => {
        e.preventDefault(); if (!result.trim()) return;
        const conversation = makeConversation({ ...emptyConversation, response: result.trim(), promise: nextStep.trim(), kind: contactKind });
        const success = setClients(current => current.map(c => c.id === completionId ? updatePulseClient(c, { conversation, waitingForBusiness: !conversation.analysis.stopContact && !!nextStep.trim(), nextAction: conversation.analysis.stopContact ? '' : nextStep.trim(), nextActionDismissed: !nextStep.trim() || conversation.analysis.stopContact, nextActionDueAt: deadline ? new Date(deadline).toISOString() : '' }, result.trim(), 'activity') : c));
        if (success) { recordConversationAnalysis({ id: completionClient.id, name: completionClient.name, updatedAt: new Date().toISOString() }, conversation, demo); setCompletionId(null); setAnnouncement('Результат сохранён. Следующее действие и очередь обновлены.'); }
      }}><label className={workspaceStyles.fullField}><span>Как общались</span><select name="interactionKind" value={contactKind} onChange={e => setContactKind(e.target.value as ConversationInput['kind'])}><option value="call">Звонок</option><option value="message">Сообщение</option><option value="meeting">Встреча</option></select></label><label className={workspaceStyles.fullField}><span>Что произошло *</span><textarea autoFocus required rows={4} value={result} onChange={e => setResult(e.target.value)} placeholder="КП отправлено. Клиент подтвердил получение." /></label><label className={workspaceStyles.fullField}><span>Следующее действие</span><input value={nextStep} onChange={e => setNextStep(e.target.value)} placeholder="Уточнить решение клиента" /></label><label className={workspaceStyles.fullField}><span>Срок (местное время)</span><input type="datetime-local" required={!!nextStep.trim()} value={deadline} onChange={e => setDeadline(e.target.value)} /></label><p>Если продолжение не требуется, оставьте следующее действие пустым. Сделка останется на текущем этапе.</p><div className={workspaceStyles.sheetActions}><span /><div><button type="button" onClick={() => setCompletionId(null)}>Отмена</button><button className={workspaceStyles.saveButton} type="submit">Сохранить результат</button></div></div>{storageError ? <p role="alert">{storageError}</p> : null}</form></section></PulseDialog> : null}
    </div>
  );
}
