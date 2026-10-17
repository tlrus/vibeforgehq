"use client";

import { Bot, Check, ChevronRight, Clock3, ListChecks, MessageCircle, Phone, PhoneIncoming, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import { formatMoney, type ManagerTask } from "./manager-data";
import styles from "@/app/pilot/manager/manager.module.css";

type ManagerWorkflowProps = {
  tasks: ManagerTask[];
  completedIds: string[];
  onComplete: (id: string) => void;
  onInjectReply: () => void;
};

function TaskIcon({ kind }: { kind: ManagerTask["kind"] }) {
  return kind === "call" ? <Phone /> : kind === "message" ? <MessageCircle /> : <RotateCcw />;
}

export function ManagerWorkflow({ tasks, completedIds, onComplete, onInjectReply }: ManagerWorkflowProps) {
  const activeTasks = tasks.filter((task) => !completedIds.includes(task.id));
  const [selectedId, setSelectedId] = useState(tasks[0]?.id ?? "");
  const selectedTask = activeTasks[0]?.id === "reply-task"
    ? activeTasks[0]
    : activeTasks.find((task) => task.id === selectedId) ?? activeTasks[0];
  const done = tasks.filter((task) => completedIds.includes(task.id)).length;

  return (
    <main className={`${styles.main} ${styles.workflowMain}`}>
      <section className={styles.sectionHeading}>
        <div><span><ListChecks /> Поток задач</span><h1>Не выбирайте — выполняйте</h1><p>AI перестраивает очередь после каждого действия и нового ответа клиента.</p></div>
        <div className={styles.flowProgress}><strong>{done}</strong><span>выполнено</span><i /><b>{activeTasks.length} осталось</b></div>
      </section>

      <section className={styles.workflowGrid}>
        <aside className={styles.queuePanel}>
          <header><div><strong>Очередь на сегодня</strong><small>Сверху — самое важное</small></div><span>{activeTasks.length}</span></header>
          <div className={styles.taskQueue} aria-label="Очередь задач менеджера">
            {activeTasks.map((task, index) => (
              <button key={task.id} className={selectedTask?.id === task.id ? styles.selectedTask : ""} onClick={() => setSelectedId(task.id)}>
                <span className={styles.taskNumber}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.taskKind}><TaskIcon kind={task.kind} /></span>
                <span className={styles.taskText}><strong>{task.client}</strong><small>{task.action}</small><em>{task.product} · {task.stage}</em></span>
                <span className={styles.taskWait}>{task.wait}</span>
                <ChevronRight />
              </button>
            ))}
            {activeTasks.length === 0 && <div className={styles.emptyQueue}><Check /><strong>На сегодня всё</strong><span>Новые ответы клиентов автоматически создадут следующий шаг.</span></div>}
          </div>
        </aside>

        <section className={styles.coachPanel}>
          {selectedTask ? (
            <>
              <header><span><Bot /> AI-помощь по выбранному клиенту</span><em>{selectedTask.temperature}</em></header>
              <div className={styles.coachClient}><div><small>{selectedTask.product} · {selectedTask.stage}</small><h2>{selectedTask.client}</h2><p>{selectedTask.action}</p></div><strong>{formatMoney(selectedTask.value)}</strong></div>
              <div className={styles.coachContext}><small>Что AI понял</small><p>{selectedTask.context}</p></div>
              <div className={styles.coachAdvice}><Sparkles /><div><small>Лучший следующий шаг</small><p>{selectedTask.insight}</p></div></div>
              <div className={styles.coachScript}><small>Готовый текст</small><blockquote>«{selectedTask.script}»</blockquote></div>
              <div className={styles.coachActions}><button onClick={() => onComplete(selectedTask.id)}><Check /> Готово, следующий клиент</button></div>
            </>
          ) : <div className={styles.dayComplete}><Check /><h2>Поток выполнен</h2><p>Можно работать с новой базой или дождаться ответа клиента.</p></div>}
        </section>

        <aside className={styles.flowLogic}>
          <header><span><Sparkles /> Как меняется очередь</span><small>AI следит за событиями</small></header>
          <ol>
            <li><span><Phone /></span><div><strong>Менеджер позвонил</strong><small>Результат фиксируется в CRM</small></div></li>
            <li><span><Clock3 /></span><div><strong>Клиент не ответил</strong><small>Создаётся повтор по регламенту</small></div></li>
            <li><span><PhoneIncoming /></span><div><strong>Клиент написал</strong><small>Ответ сразу поднимается наверх</small></div></li>
            <li><span><Bot /></span><div><strong>AI готовит следующий шаг</strong><small>Контекст и текст уже в задаче</small></div></li>
          </ol>
          <button className={styles.incomingDemo} onClick={onInjectReply}><PhoneIncoming /> Демо: пришёл ответ клиента</button>
          <p>В рабочей версии события поступают из CRM, телефонии и подключённого чата. Здесь показана логика демо.</p>
        </aside>
      </section>
    </main>
  );
}
