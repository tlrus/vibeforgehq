"use client";

import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  Clock3,
  FileUp,
  LayoutDashboard,
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Waypoints,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
  type CSSProperties,
  type DragEvent,
  type FormEvent,
} from "react";
import styles from "@/app/business-pulse/manual-pulse.module.css";
import { ManualAiControl } from "@/components/manual-ai-control";
import { ManualBusinessFlow } from "@/components/manual-business-flow";
import { PulseConversationFields, PulseBehaviorArc } from './pulse-conversation-fields';
import { PulseTodayWork } from './pulse-today-work';
import { clientConversation, conversationText, emptyConversation, makeConversation, normalizeSource, pendingAction, temperatureMeta, type ConversationInput, type ConversationAnalysis } from '@/lib/pulse-conversation';
import {
  businessPulseStages,
  emptyBusinessPulseForm,
  parseStoredBusinessPulseClients,
  type BusinessPulseClient,
  type BusinessPulseClientForm,
  type BusinessPulseView,
} from "@/lib/business-pulse-data";
import { parseManualClientImport } from "@/lib/manual-pulse-import";
import { PulseDialog } from './pulse-dialog';
import { PulseAgentPanel } from './pulse-agent-panel';
import { PulseAgentDashboard, PulseAgentTeamSummary } from './pulse-agent-dashboard';
import { recordConversationAnalysis } from '@/lib/pulse-agent-activity';
import { usePulseWorkspace } from '@/lib/use-pulse-workspace';
import { usePulseNavigation } from '@/lib/use-pulse-navigation';
import { hasInteractionOnDay, localDay, localYesterday, pulseRisk, updatePulseClient } from '@/lib/business-pulse-workspace';

const stageCatalog = businessPulseStages;
const emptyForm = emptyBusinessPulseForm;


export function ManualBusinessPulse() {
  const { clients, setClients, hydrated, error: storageError, demo, exportBackup } = usePulseWorkspace();
  const { query, navigate } = usePulseNavigation();
  const rawView = query.get('view');
  const view: BusinessPulseView = rawView === 'crm' ? 'crm' : rawView === 'ai-control' ? 'ai-control' : 'pulse';
  const setView = (value: BusinessPulseView) => navigate({ view: value, client: null, create: null });
  const search = query.get('q') ?? '';
  const setSearch = (value: string) => navigate({ q: value }, true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BusinessPulseClientForm>(emptyForm);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importNotice, setImportNotice] = useState("");
  const selectedFlowStage = query.has('stage') && /^[0-6]$/.test(query.get('stage')!) ? Number(query.get('stage')) : null;
  const setSelectedFlowStage = (update: (current: number | null) => number | null) => navigate({ stage: update(selectedFlowStage)?.toString() ?? null });
  const crmMode = query.get('mode') === 'threads' ? 'threads' : 'kanban';
  const setCrmMode = (value: string) => navigate({ mode: value });
  const [notice, setNotice] = useState('');
  const [removed, setRemoved] = useState<BusinessPulseClient | null>(null);
  const [activity, setActivity] = useState('');
  const [conversationDraft, setConversationDraft] = useState<ConversationInput>(emptyConversation);
  const [interpretation, setInterpretation] = useState<Partial<ConversationAnalysis>>({});
  const [completedPrevious, setCompletedPrevious] = useState(false);
  const conversationInput = { ...conversationDraft, managerWords: activity };
  const snapshot = makeConversation(conversationInput, interpretation);
  const hasContact = Boolean(activity.trim() || conversationDraft.response.trim());
  const resetConversation = () => { setActivity(''); setConversationDraft(emptyConversation); setInterpretation({}); setCompletedPrevious(false); };
  const [baseline, setBaseline] = useState('');
  const dirty = editorOpen && (JSON.stringify(form) !== baseline || Boolean(conversationText(conversationInput)) || Object.keys(interpretation).length > 0 || completedPrevious);
  const [compAiSyncing, setCompAiSyncing] = useState(false);

  const syncWithCompAi = async () => {
    if (clients.length === 0) {
      setNotice("Нет клиентов для синхронизации с Comp AI CRM.");
      return;
    }
    setCompAiSyncing(true);
    try {
      const res = await fetch("/api/compai/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clients }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotice(`Успешно синхронизировано с Comp AI CRM: ${data.synced} из ${data.total} клиентов.`);
      } else {
        setNotice(`Comp AI CRM запущен локально на ПК. На сайте активен встроенный AI-агент — откройте карточку клиента для брифа и рекомендаций.`);
      }
    } catch {
      setNotice("Comp AI CRM запущен на вашем ПК. На сайте активен встроенный AI-агент — откройте любую карточку для генерации брифа к звонку.");
    } finally {
      setCompAiSyncing(false);
    }
  };

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const activeClients = clients.filter((client) => client.stage < 6);
  const today = localDay();
  const yesterday = localYesterday();
  const dayFilter = query.get('day') || 'all';
  const setDayFilter = (value: string) => navigate({ day: value === 'all' ? null : value });
  const todayClientsCount = clients.filter(c => hasInteractionOnDay(c, today)).length;
  const yesterdayClientsCount = clients.filter(c => hasInteractionOnDay(c, yesterday)).length;
  const managerStats = Array.from(new Set(clients.map((client) => client.manager).filter(Boolean)))
    .map((manager) => {
      const items = clients.filter((client) => client.manager === manager);
      return {
        manager,
        conversations: items.filter((client) => client.stage >= 1).length,
        advanced: items.filter((client) => client.stage >= 2 && client.stage < 6).length,
        closed: items.filter((client) => client.stage === 6).length,
      };
    })
    .sort((left, right) => right.advanced - left.advanced);
  const visibleClients = clients.filter((client) => {
    if (selectedFlowStage !== null && client.stage !== selectedFlowStage) return false;
    if (query.get('attention') === '1' && !pulseRisk(client)) return false;
    if (dayFilter === "today" && !hasInteractionOnDay(client, today)) return false;
    if (dayFilter === "yesterday" && !hasInteractionOnDay(client, yesterday)) return false;
    const searchQuery = search.trim().toLocaleLowerCase("ru-RU");
    if (!searchQuery) return true;
    return [client.name, client.contact, client.phone, client.manager, client.source, client.note]
      .join(" ")
      .toLocaleLowerCase("ru-RU")
      .includes(searchQuery);
  });
  const editingClient = editingId ? clients.find((client) => client.id === editingId) : undefined;
  const returnTo = query.get('returnTo');
  const managerReturn = returnTo && /^\/business-pulse\/manager(?:\?|$)/.test(returnTo) ? returnTo : null;

  const conversationChanges = (): Partial<BusinessPulseClient> => {
    const sourceRaw = form.sourceRaw ?? form.source;
    const promise = conversationDraft.promise.trim();
    const suggested = promise || pendingAction(conversationDraft.response);
    const actionChanged = Boolean(suggested && suggested !== editingClient?.nextAction);
    const dueChanged = form.nextActionDueAt !== (editingClient?.nextActionDueAt ?? '');
    const stop = hasContact ? snapshot.analysis.stopContact : clientConversation(editingClient || { ...form, id: 'draft', createdAt: '', updatedAt: '', history: [] }).analysis.stopContact;
    return { ...form, sourceRaw, source: normalizeSource(sourceRaw),
      ...(hasContact ? { conversation: snapshot, stage: form.stage === 0 ? 1 : form.stage } : Object.keys(interpretation).length && editingClient ? { conversation: { ...clientConversation(editingClient), reviewed: true, analysis: { ...clientConversation(editingClient).analysis, ...interpretation } } } : {}),
      nextAction: stop ? '' : suggested || (completedPrevious ? '' : form.nextAction),
      nextActionDismissed: stop || (completedPrevious && !suggested) ? true : suggested || form.nextAction !== editingClient?.nextAction ? false : editingClient?.nextActionDismissed,
      nextActionDueAt: stop || (completedPrevious && !suggested) || (actionChanged && !dueChanged) ? '' : form.nextActionDueAt,
      waitingForBusiness: stop ? false : suggested ? true : completedPrevious ? false : form.waitingForBusiness,
    };
  };

  const openCreate = (stage = 0) => {
    setEditingId(null);
    setForm({ ...emptyForm, stage });
    setBaseline(JSON.stringify({ ...emptyForm, stage }));
    navigate({ create: '1', client: null });
    resetConversation();
    setDeleteArmed(false);
    setEditorOpen(true);
  };

  const openClient = (client: BusinessPulseClient, changeUrl = true) => {
    setEditingId(client.id);
    const nextForm = {
      name: client.name,
      contact: client.contact,
      phone: client.phone,
      product: client.product,
      source: client.source,
      sourceRaw: client.sourceRaw ?? client.source,
      manager: client.manager,
      stage: client.stage,
      value: client.value,
      note: client.note,
      waitingForBusiness: client.waitingForBusiness,
      nextAction: client.nextAction ?? '', nextActionDueAt: client.nextActionDueAt ?? '', agentComment: client.agentComment ?? '', outcome: client.outcome ?? (client.stage === 6 ? 'not_relevant' : 'open'), parentClientId: client.parentClientId,
    };
    setForm(nextForm);
    setBaseline(JSON.stringify(nextForm));
    resetConversation();
    if (changeUrl) navigate({ client: client.id, create: null });
    setDeleteArmed(false);
    setEditorOpen(true);
  };

  useEffect(() => {
    if (!hydrated) return;
    const frame = requestAnimationFrame(() => {
      const id = query.get('client');
      const client = clients.find(item => item.id === id);
      if (client && (!editorOpen || editingId !== id)) openClient(client, false);
      else if (!id && query.get('create') !== '1') setEditorOpen(false);
      if (id && !client) setNotice('Карточка не найдена в этой базе. Вернитесь к списку компаний.');
    });
    return () => cancelAnimationFrame(frame);
  // URL owns selection; form edits must not be reset by storage refreshes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, hydrated]);

  const closeEditor = (saved = false) => {
    if (!saved && (dirty || activity.trim()) && !window.confirm('Закрыть карточку без сохранения изменений?')) return;
    setEditorOpen(false);
    setDeleteArmed(false);
    navigate({ client: null, create: null }, true);
  };

  const addTouchDirectly = () => {
    const commentText = hasContact ? conversationText(conversationInput) : '';
    if (!commentText) return;
    const now = new Date().toISOString();
    if (editingId) {
      const success = setClients((current) => current.map((client) => client.id === editingId ? updatePulseClient(client, { ...conversationChanges(), name: form.name.trim() || client.name, note: commentText }, commentText, 'activity', now) : client));
      if (!success) return;
      const savedForm = { ...form, ...conversationChanges(), note: commentText };
      recordConversationAnalysis({ id: editingId, name: form.name, updatedAt: now }, snapshot, demo);
      setForm(savedForm); resetConversation();
      setBaseline(JSON.stringify(savedForm));
      setNotice('Информация добавлена как новое касание в историю.');
    } else {
      const name = form.name.trim() || 'Новый клиент';
      const id = window.crypto.randomUUID();
      const success = setClients((current) => [updatePulseClient({ ...form, id, name, createdAt: now, updatedAt: now, history: [] }, { ...conversationChanges(), note: commentText }, commentText, 'created', now), ...current]);
      if (!success) return;
      setNotice('Клиент создан и первое касание добавлено в историю.');
      recordConversationAnalysis({ id, name, updatedAt: now }, snapshot, demo);
      closeEditor(true);
    }
  };

  const saveClient = (event?: FormEvent) => {
    event?.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    const now = new Date().toISOString();
    const commentText = hasContact ? conversationText(conversationInput) : '';
    if (editingId) {
      const success = setClients((current) => current.map((client) => client.id === editingId ? updatePulseClient(client, { ...conversationChanges(), name, note: commentText || form.note || client.note }, commentText, commentText ? 'activity' : 'updated', now) : client));
      if (!success) return;
      if (hasContact) recordConversationAnalysis({ id: editingId, name, updatedAt: now }, snapshot, demo);
    } else {
      const id = window.crypto.randomUUID();
      const success = setClients((current) => [updatePulseClient({ ...form, id, name, createdAt: now, updatedAt: now, history: [] }, { ...conversationChanges(), note: commentText || form.note }, commentText, 'created', now), ...current]);
      if (!success) return;
      if (hasContact) recordConversationAnalysis({ id, name, updatedAt: now }, snapshot, demo);
    }
    setNotice(commentText ? 'Сохранено с добавлением нового касания.' : 'Сохранено. Пульс, CRM и очередь менеджера обновлены.');
    closeEditor(true);
  };

  const deleteClient = () => {
    if (!editingId) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    if (!setClients((current) => current.filter((client) => client.id !== editingId))) return;
    setRemoved(editingClient ?? null);
    setNotice('Карточка удалена. Можно отменить действие.');
    closeEditor(true);
  };

  const moveClient = (id: string, stage: number) => {
    if (stage < 0 || stage >= stageCatalog.length) return;
    if (setClients((current) => current.map((client) => client.id === id && client.stage !== stage ? updatePulseClient(client, { stage }) : client))) setNotice('Этап изменён. Переход сохранён в истории.');
  };

  const dropClient = (event: DragEvent, stage: number) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/client-id");
    if (id) moveClient(id, stage);
  };

  const importClients = (event: FormEvent) => {
    event.preventDefault();
    setImportError("");
    try {
      const parsed: unknown = JSON.parse(importText);
      const backup = Array.isArray(parsed) && parsed.every(item => item && typeof item === 'object' && 'id' in item && 'history' in item) ? parseStoredBusinessPulseClients(importText) : null;
      if (backup && Array.isArray(parsed) && backup.length !== parsed.length) throw new Error('Резервная копия содержит некорректные карточки. Импорт отменён.');
      if (backup) {
        if (!setClients(current => { const ids = new Set(current.map(c => c.id)); return [...backup.filter(c => !ids.has(c.id)), ...current]; })) return;
        setNotice('Резервная копия прочитана. Отсутствующие карточки восстановлены с историей; существующие сохранены.');
        setImportOpen(false); setImportText(''); setView('crm'); return;
      }
      const records = parseManualClientImport(importText);
      const now = new Date().toISOString();
      const success = setClients((current) => {
        const known = new Set(current.map((client) => `${client.name.toLocaleLowerCase("ru-RU")}|${client.phone}`));
        const additions = records.flatMap((record) => {
          const key = `${record.name.toLocaleLowerCase("ru-RU")}|${record.phone}`;
          if (known.has(key)) return [];
          known.add(key);
          return [{
            ...record,
            contact: "",
            product: record.product,
            id: window.crypto.randomUUID(),
            createdAt: record.createdAt ?? now,
            updatedAt: record.updatedAt ?? record.createdAt ?? now,
            history: [],
          } satisfies BusinessPulseClient];
        });
        return [...additions, ...current];
      });
      if (!success) return;
      setImportNotice(`${records.length} строк обработано. Повторы не добавлены.`);
      setImportText("");
      setImportOpen(false);
      setView("crm");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Не удалось импортировать данные");
    }
  };

  return (
    <div className={styles.canvas}>
      <header className={styles.appHeader}>
        <div className={styles.identity}>
          <span>BP</span>
          <div><strong>Бизнес Пульс</strong><small>РУЧНАЯ CRM · КЛИЕНТСКИЕ НИТИ</small></div>
        </div>
        <nav aria-label="Разделы ручного Business Pulse">
          <button type="button" className={view === "pulse" ? styles.activeNav : ""} onClick={() => setView("pulse")}><LayoutDashboard /> Пульс</button>
          <button type="button" className={view === "crm" ? styles.activeNav : ""} onClick={() => setView("crm")}><LayoutGrid /> CRM</button>
          <button type="button" className={view === "ai-control" ? styles.activeNav : ""} onClick={() => setView("ai-control")}><BrainCircuit /> AI-контроль</button>
          <Link href={`/business-pulse/manager?${new URLSearchParams({ from: `/business-pulse?${query}`, ...(demo ? { demo: '1' } : {}) })}`}><UserRound /> Менеджер</Link>
        </nav>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.importButton}
            onClick={syncWithCompAi}
            disabled={compAiSyncing}
            title="Синхронизировать базу клиентов с Comp AI CRM"
          >
            <RefreshCw className={compAiSyncing ? styles.spin : ""} />
            {compAiSyncing ? "Синхронизация..." : "Comp AI"}
          </button>
          <button type="button" className={styles.importButton} onClick={exportBackup}>Экспорт</button>
          <button type="button" className={styles.importButton} onClick={() => { setImportError(""); setImportOpen(true); }}><FileUp /> Импорт</button>
          <button type="button" className={styles.addButton} onClick={() => openCreate()}><Plus /> Добавить</button>
        </div>
      </header>

      <div className={styles.workspaceBar}>
        <div>{managerReturn ? <Link href={managerReturn}><ArrowLeft /> К задаче менеджера</Link> : view !== 'pulse' ? <button onClick={() => setView('pulse')}><ArrowLeft /> К пульсу</button> : <span>Рабочее пространство</span>}<span>{demo ? 'Демонстрационные данные' : 'Данные сохраняются в этом браузере'}</span></div>
        <a href={demo ? '/business-pulse' : '/business-pulse?demo=1'}>{demo ? 'Вернуться к рабочей базе' : 'Показать демо клиенту'} <ArrowRight /></a>
      </div>
      {storageError ? <p className={styles.feedback} role="alert">{storageError}</p> : null}
      {notice ? <div className={styles.feedback} role="status"><span>{notice}</span>{removed ? <button onClick={() => { if (setClients(current => current.some(c => c.id === removed.id) ? current : [removed, ...current])) { setRemoved(null); setNotice('Карточка восстановлена.'); } }}>Отменить удаление</button> : null}<button onClick={() => setNotice('')} aria-label="Закрыть уведомление"><X /></button></div> : null}

      {view === "pulse" ? (
        <main className={styles.main}>
          <section className={styles.pageHeading}>
            <div><span><Activity /> Business Pulse · {demo ? 'демонстрация' : 'ваша клиентская база'}</span><h1>Что требует вашего внимания</h1><p>{clients.length} компаний. Ответственные, договорённости и следующий шаг — в одной истории.</p></div>
            <span className={styles.storageState}><Check /> {importNotice || `${clients.length} компаний загружено`}</span>
          </section>

          {hydrated && clients.length === 0 ? <PulseAgentDashboard clients={clients} demo={demo} onOpenClient={openClient} /> : null}

          {!hydrated ? (
            <section className={styles.loadingState}>Загружаем рабочее пространство…</section>
          ) : clients.length === 0 ? (
            <section className={styles.emptyHero}>
              <div className={styles.emptyIcon}><BriefcaseBusiness /></div>
              <span>Пустая рабочая база</span>
              <h2>Добавьте первого клиента</h2>
              <p>Создайте карточку, укажите этап и сумму. CRM и Business Pulse обновятся одновременно.</p>
              <button type="button" onClick={() => openCreate()}><Plus /> Добавить клиента</button>
              <div className={styles.onboardingSteps}>
                <span><b>1</b>Создать карточку</span><ArrowRight />
                <span><b>2</b>Передвигать по канбану</span><ArrowRight />
                <span><b>3</b>Смотреть пульс</span>
              </div>
            </section>
          ) : (
            <>
              <PulseTodayWork clients={clients} onOpenClient={openClient} onCreate={() => openCreate()} />
              <div>
                <section className={styles.teamPanel}>
                  <PulseAgentTeamSummary demo={demo} />
                  {managerStats.slice(0, 4).map((item) => <article key={item.manager}><span>{item.manager.slice(0, 1).toUpperCase()}</span><div><strong>{item.manager}</strong><small>{item.conversations} контактов · {item.advanced} после презентации</small></div><em>{item.closed} закрыто</em></article>)}
                </section>
              </div>

              <PulseAgentDashboard clients={clients} demo={demo} onOpenClient={openClient} />

              {demo ? <section className={styles.demoStory}><div><span>Сценарий для демонстрации · 1 минута</span><h2>Обещание превращается в контролируемое действие</h2><p>Откройте «Север», проверьте просроченное КП на 780 000 ₸. Запишите результат отправки и назначьте следующий контакт. Сигнал исчезнет, а событие останется в истории.</p></div><button onClick={() => { const client = clients.find(c => c.id === 'demo-1'); if (client) openClient(client); }}>Разобрать сделку <ArrowRight /></button></section> : null}

              <ManualBusinessFlow
                clients={clients}
                selectedStage={selectedFlowStage}
                onOpenClient={openClient}
                onSelectStage={(stage) => setSelectedFlowStage((current) => stage < 0 || current === stage ? null : stage)}
              />

            </>
          )}
        </main>
      ) : view === "crm" ? (
        <main className={`${styles.main} ${styles.crmMain}`}>
          <section className={styles.crmHeading}>
            <div><span>CRM · журнал активности</span><h1>Компании</h1><p>Каждая карточка объединяет повторные касания из журнала. Перетаскивайте её между этапами или уточняйте данные внутри.</p></div>
            <div className={styles.crmSummary}><strong>{clients.length}</strong><span>компаний<br /><small>{activeClients.length} требуют продолжения</small></span></div>
          </section>

          <div className={styles.crmViewTabs} role="group" aria-label="Режим отображения CRM">
            <button type="button" className={crmMode === "kanban" ? styles.crmViewActive : ""} onClick={() => setCrmMode("kanban")} aria-pressed={crmMode === "kanban"}><LayoutGrid /> Канбан</button>
            <button type="button" className={crmMode === "threads" ? styles.crmViewActive : ""} onClick={() => setCrmMode("threads")} aria-pressed={crmMode === "threads"}><Waypoints /> Нити</button>
            <span>{crmMode === "kanban" ? "Карточки по этапам" : "Единая база → текущий этап"}</span>
          </div>

          <section className={styles.crmToolbar} aria-label="Фильтры CRM">
            <label><Search /><input type="search" aria-label="Поиск компаний" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Компания, контакт, телефон…" /></label>
            <div role="group" aria-label="Фильтр по дням взаимодействий">
              <button type="button" className={dayFilter === "all" ? styles.filterActive : ""} onClick={() => setDayFilter("all")}>Все дни</button>
              <button type="button" className={dayFilter === "today" ? styles.filterActive : ""} onClick={() => setDayFilter("today")}>Сегодня {todayClientsCount ? `(${todayClientsCount})` : ''}</button>
              <button type="button" className={dayFilter === "yesterday" ? styles.filterActive : ""} onClick={() => setDayFilter("yesterday")}>Вчера {yesterdayClientsCount ? `(${yesterdayClientsCount})` : ''}</button>
            </div>
            <button type="button" className={styles.toolbarAdd} onClick={() => openCreate()}><Plus /> Новый клиент</button>
          </section>
          <div className={styles.workspaceBar}><span role="status">Найдено: {visibleClients.length}{selectedFlowStage !== null ? ` · ${stageCatalog[selectedFlowStage].label}` : ''}{query.get('attention') === '1' ? ' · Требуют внимания' : ''}{dayFilter === 'today' ? ' · Касания за сегодня' : dayFilter === 'yesterday' ? ' · Касания за вчера' : ''}</span><button onClick={() => navigate({ q: null, sector: null, stage: null, attention: null, day: null })}>Сбросить фильтры</button></div>
          {visibleClients.length === 0 ? <div className={styles.loadingState}>По этим условиям компаний нет. Измените поиск или сбросьте фильтры.</div> : null}

          {crmMode === "kanban" ? <section className={styles.kanban} aria-label="Канбан сделок">
            {stageCatalog.map((stage, stageIndex) => {
              const stageClients = visibleClients.filter((client) => client.stage === stageIndex);
              return (
                <section
                  key={stage.label}
                  className={styles.kanbanColumn}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => dropClient(event, stageIndex)}
                  style={{ "--stage-accent": stage.color } as CSSProperties}
                  aria-label={`${stage.label}: ${stageClients.length} клиентов`}
                >
                  <header><div><span>{String(stageIndex + 1).padStart(2, "0")}</span><strong>{stage.label}</strong></div><b>{stageClients.length}</b><small>{stage.short}</small></header>
                  <div className={styles.kanbanCards}>
                    {stageClients.map((client) => {
                      const interest = temperatureMeta[clientConversation(client).analysis.temperature];
                      return (
                        <article key={client.id} className={client.waitingForBusiness ? styles.waitingCard : ""} draggable onDragStart={(event) => event.dataTransfer.setData("text/client-id", client.id)}>
                          <button type="button" className={styles.cardBody} onClick={() => openClient(client)}>
                            <div className={styles.clientCardTop}><span style={{ "--product-accent": interest.color } as CSSProperties}>{interest.label}</span>{client.waitingForBusiness ? <em><Clock3 /> ждёт нас</em> : null}</div>
                            <h3>{client.name}</h3>
                            <p>{client.note || "Комментарий пока не добавлен"}</p>
                            <dl><div><dt>Контакт</dt><dd>{client.contact || "Не указан"}</dd></div><div><dt>Касаний</dt><dd>{client.history.length}</dd></div></dl>
                            <footer><span>{client.source}</span><time>{new Date(client.updatedAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}</time></footer>
                          </button>
                          <div className={styles.cardMoves}>
                            <button type="button" disabled={stageIndex === 0} onClick={() => moveClient(client.id, stageIndex - 1)} aria-label={`Вернуть клиента ${client.name} на предыдущий этап`}><ArrowLeft /></button>
                            <button type="button" disabled={stageIndex === stageCatalog.length - 1} onClick={() => moveClient(client.id, stageIndex + 1)} aria-label={`Продвинуть клиента ${client.name} на следующий этап`}><ArrowRight /></button>
                          </div>
                        </article>
                      );
                    })}
                    {stageClients.length === 0 ? <button type="button" className={styles.emptyColumn} onClick={() => openCreate(stageIndex)}><Plus /> Добавить на этап</button> : null}
                  </div>
                </section>
              );
            })}
          </section> : (
            <ManualBusinessFlow
              clients={visibleClients}
              selectedStage={selectedFlowStage}
              onOpenClient={openClient}
              onSelectStage={(stage) => setSelectedFlowStage((current) => stage < 0 || current === stage ? null : stage)}
              variant="crm"
            />
          )}
          <p className={styles.crmHint}>Переходы вперёд и назад сохраняются в истории. Экспортируйте базу для резервной копии. Серверная синхронизация ещё не подключена.</p>
        </main>
      ) : (
        <ManualAiControl clients={clients} onOpenClient={openClient} />
      )}

      {editorOpen ? (
        <PulseDialog title="client-editor-title" onClose={() => closeEditor()}>
          <aside className={styles.editorSheet}>
            <header><div><span>{editingId ? "Карточка клиента" : "Новый клиент"}</span><h2 id="client-editor-title">{editingId ? form.name || "Без имени" : "Добавить в CRM"}</h2></div><button type="button" onClick={() => closeEditor()} aria-label="Назад к списку"><ArrowLeft /></button></header>
            <form onSubmit={saveClient}>
              <label className={styles.fullField}><span>Компания *</span><input name="company" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Название компании" autoFocus /></label>
              <div className={styles.fieldGrid}>
                <label><span>Контактное лицо</span><input name="contact" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="Имя и роль" /></label>
                <label><span>Телефон / адрес для связи</span><input name="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+7…, WhatsApp, email" /></label>
              </div>
              <label className={styles.fullField}><span>Откуда клиент — своими словами</span><input name="sourceRaw" value={form.sourceRaw ?? form.source} onChange={e => setForm(f => ({ ...f, sourceRaw: e.target.value }))} placeholder="С базы, с сайта, знакомый порекомендовал…" /><small>Сохранится как: {normalizeSource(form.sourceRaw ?? form.source)}. Исходный текст не теряется.</small></label>
              {editingClient ? <PulseBehaviorArc client={editingClient} /> : null}
              <PulseConversationFields input={conversationInput} existing={!hasContact && Boolean(editingClient)} analysis={!hasContact && editingClient ? { ...clientConversation(editingClient).analysis, ...interpretation } : snapshot.analysis} overrides={interpretation} onOverrides={setInterpretation} onChange={value => { setConversationDraft(value); setActivity(value.managerWords); setInterpretation({}); }} />
              {form.nextAction ? <div className={styles.previousContext}><strong>Текущее обязательство:</strong> {form.nextAction}<label><input name="completedPrevious" type="checkbox" checked={completedPrevious} onChange={e => setCompletedPrevious(e.target.checked)} /> Выполнено — убрать из задач после сохранения</label></div> : null}
              <label className={styles.fullField}><span>Срок договорённости (местное время)</span><input name="nextActionDueAt" type="datetime-local" value={form.nextActionDueAt ? new Date(new Date(form.nextActionDueAt).getTime() - new Date(form.nextActionDueAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={e => setForm(f => ({ ...f, nextActionDueAt: e.target.value ? new Date(e.target.value).toISOString() : '' }))} /><small>Без точной даты обещание останется в разделе «Нужно запланировать». Автоматически выдумывать срок не будем.</small></label>
              <div className={styles.touchActionRow}><button type="button" className={styles.addTouchOnlyButton} disabled={!hasContact || !form.name.trim()} onClick={addTouchDirectly}><Plus /> Сохранить касание и продолжить</button><small>Разбор, ответ и ваши действия сохранятся вместе. Поля нового разговора очистятся.</small></div>
              <details className={styles.advancedFields}><summary>Реквизиты и ручная настройка</summary>
                <div className={styles.fieldGrid}>
                  <label><span>Менеджер</span><input name="manager" value={form.manager} onChange={e => setForm(f => ({ ...f, manager: e.target.value }))} /></label>
                  <label><span>Этап</span><select name="stage" value={form.stage} onChange={e => setForm(f => ({ ...f, stage: Number(e.target.value) }))}>{stageCatalog.map((stage, index) => <option key={stage.label} value={index}>{stage.label}</option>)}</select></label>
                  <label><span>Сумма сделки, ₸</span><input name="value" type="number" min="0" value={form.value || ''} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} /></label>
                  <label><span>Результат закрытия</span><select name="outcome" disabled={form.stage !== 6} value={form.stage === 6 ? form.outcome === 'open' ? 'not_relevant' : form.outcome ?? 'not_relevant' : 'open'} onChange={e => setForm(f => ({ ...f, outcome: e.target.value as BusinessPulseClient['outcome'] }))}><option value="open">В работе</option><option value="won">Успешная сделка</option><option value="lost">Отказ</option><option value="not_relevant">Неактуально</option></select></label>
                </div>
                <label className={styles.fullField}><span>Следующее действие — вручную</span><input name="nextAction" value={form.nextAction ?? ''} onChange={e => setForm(f => ({ ...f, nextAction: e.target.value }))} /></label>
                <label className={styles.waitingToggle}><input name="waitingForBusiness" type="checkbox" checked={form.waitingForBusiness} onChange={e => setForm(f => ({ ...f, waitingForBusiness: e.target.checked }))} /><span><b>{form.waitingForBusiness ? <Check /> : null}</b><strong>Клиент ждёт действие компании</strong></span></label>
              </details>
              <PulseAgentPanel
                key={editingId || 'draft'}
                demo={demo}
                onAgentCommentChange={(agentComment) => setForm(f => ({ ...f, agentComment }))}
                client={{
                  ...editingClient,
                  id: editingId || "draft",
                  name: form.name || "Новый клиент",
                  contact: form.contact,
                  phone: form.phone,
                  product: form.product,
                  source: normalizeSource(form.sourceRaw ?? form.source),
                  manager: form.manager,
                  stage: form.stage,
                  value: form.value,
                  note: hasContact ? conversationText(conversationInput) : form.note,
                  waitingForBusiness: form.waitingForBusiness,
                  nextAction: form.nextAction,
                  nextActionDueAt: form.nextActionDueAt,
                  agentComment: form.agentComment,
                  createdAt: editingClient?.createdAt || new Date().toISOString(),
                  updatedAt: editingClient?.updatedAt || new Date().toISOString(),
                  history: editingClient?.history || [],
                }}
                onApplyNextAction={(action, dueAtIso) => {
                  setForm((f) => ({ ...f, nextAction: action, nextActionDueAt: dueAtIso, waitingForBusiness: true }));
                  setNotice("Рекомендуемый следующий шаг и срок применены в карточку.");
                }}
                onInsertComment={(script) => {
                  setForm(f => ({ ...f, agentComment: [f.agentComment, `План разговора (ещё не выполнено): ${script}`].filter(Boolean).join("\\n") }));
                  setNotice("Скрипт сохранён как план в уточнении агенту, не как выполненное касание.");
                }}
              />
              {editingClient ? <div className={styles.relatedActions}>{managerReturn ? <Link href={managerReturn}>К задаче менеджера →</Link> : <Link href={`/business-pulse/manager?${new URLSearchParams({ view: 'workflow', task: editingClient.id, ...(demo ? { demo: '1' } : {}) })}`}>Открыть задачу менеджера →</Link>}<button type="button" onClick={() => {
                if ((dirty || activity.trim()) && !window.confirm('Начать повторную сделку без сохранения изменений карточки?')) return;
                const repeat = { ...emptyForm, name: editingClient.name, contact: editingClient.contact, phone: editingClient.phone, manager: editingClient.manager, product: editingClient.product, source: editingClient.source, parentClientId: editingClient.parentClientId || editingClient.id, waitingForBusiness: true };
                setEditingId(null); setForm(repeat); setBaseline(JSON.stringify(repeat)); resetConversation(); navigate({ client: null, create: '1' });
              }}>Новая повторная сделка</button></div> : null}
              {editingClient && clients.some(c => c.id !== editingClient.id && (c.parentClientId === (editingClient.parentClientId || editingClient.id) || c.id === editingClient.parentClientId)) ? <section className={styles.relatedActions}><strong>Другие сделки клиента</strong>{clients.filter(c => c.id !== editingClient.id && (c.parentClientId === (editingClient.parentClientId || editingClient.id) || c.id === editingClient.parentClientId)).map(c => <button type="button" key={c.id} onClick={() => { if (!dirty || window.confirm('Перейти без сохранения?')) openClient(c); }}>{stageCatalog[c.stage].label} · {c.value ? `${c.value.toLocaleString('ru-RU')} ₸` : 'Сумма не указана'}</button>)}</section> : null}
              {storageError ? <p role="alert" className={styles.importError}>{storageError}</p> : null}
              {editingClient?.events?.length ? <section className={styles.journalHistory}><header><span>История действий и переходов</span><strong>{editingClient.events.length} событий</strong></header><div>{[...editingClient.events].reverse().map(event => <article key={event.id}><time>{new Date(event.at).toLocaleString('ru-RU')}</time><strong>{event.text}</strong><p>{event.actor}{event.from !== undefined && event.to !== undefined ? ` · ${stageCatalog[event.from].label} → ${stageCatalog[event.to].label}` : ''}</p></article>)}</div></section> : null}
              {editingClient?.history.length ? (
                <section className={styles.journalHistory} aria-label="История касаний">
                  <header><span>История касаний</span><strong>{editingClient.history.length} {editingClient.history.length === 1 ? 'касание' : [2, 3, 4].includes(editingClient.history.length % 10) && ![12, 13, 14].includes(editingClient.history.length % 100) ? 'касания' : 'касаний'}</strong></header>
                  <div>
                    {[...editingClient.history].reverse().map((entry) => (
                      <article key={`${entry.date}-${entry.order}`}>
                        <time dateTime={entry.date}>{new Date(`${entry.date}T12:00:00+05:00`).toLocaleDateString("ru-RU", { day: "2-digit", month: "long" })}</time>
                        <strong>{entry.result || entry.nextAction || entry.achieved || "Контакт добавлен"}</strong>
                        {[
                          ["Контакт", entry.contact], ["Канал", entry.channel], ["Получилось", entry.achieved],
                          ["Сложность", entry.difficulty], ["Следующий шаг", entry.nextAction], ["Инструменты", entry.tools],
                          ["Просрочка", entry.missed], ["Боль", entry.pain], ["Дополнительно", entry.details.join(" · ")],
                        ].filter(([, value]) => value).map(([label, value]) => <p key={label}><b>{label}</b><span>{value}</span></p>)}
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
              <div className={styles.sheetActions}>
                {editingId ? <button type="button" className={deleteArmed ? styles.deleteConfirm : styles.deleteButton} onClick={deleteClient}><Trash2 /> {deleteArmed ? "Нажмите ещё раз для удаления" : "Удалить"}</button> : <span />}
                <div>
                  <button type="button" onClick={() => closeEditor()}>Отмена</button>
                  {hasContact ? (
                    <button type="button" className={styles.saveTouchButton} onClick={() => saveClient()}>
                      <Plus /> Добавить касание и сохранить
                    </button>
                  ) : null}
                  <button type="submit" className={styles.saveButton}><Check /> Сохранить</button>
                </div>
              </div>
            </form>
          </aside>
        </PulseDialog>
      ) : null}

      {importOpen ? (
        <PulseDialog title="client-import-title" onClose={() => setImportOpen(false)}>
          <aside className={`${styles.editorSheet} ${styles.importSheet}`}>
            <header><div><span>Локальный импорт</span><h2 id="client-import-title">Загрузить журнал активности</h2></div><button type="button" onClick={() => setImportOpen(false)} aria-label="Закрыть импорт"><X /></button></header>
            <form onSubmit={importClients}>
              <div className={styles.importIntro}><FileUp /><div><strong>Импорт или восстановление из копии</strong><p>Вставьте JSON или выберите экспортированный файл. История из резервной копии сохраняется. Существующие карточки не перезаписываются.</p></div></div>
              <label className={styles.fullField}><span>Файл JSON</span><input type="file" accept="application/json,.json" onChange={async e => { const file = e.target.files?.[0]; if (file) { try { setImportText(await file.text()); setImportError(''); } catch { setImportError('Не удалось прочитать файл. Попробуйте вставить его содержимое.'); } } }} /></label>
              <label className={styles.fullField} htmlFor="manual-client-import"><span>Данные клиентов</span><textarea id="manual-client-import" value={importText} onChange={(event) => setImportText(event.target.value)} placeholder='[{"name":"Компания","source":"2ГИС","stage":1}]' rows={12} autoFocus /></label>
              {importError ? <p className={styles.importError}>{importError}</p> : null}
              <div className={styles.sheetActions}><span /><div><button type="button" onClick={() => setImportOpen(false)}>Отмена</button><button type="submit" className={styles.saveButton} disabled={!importText.trim()}><FileUp /> Импортировать</button></div></div>
            </form>
          </aside>
        </PulseDialog>
      ) : null}
    </div>
  );
}
