"use client";

import Link from "next/link";
import { Activity, Goal, ListChecks, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { ManagerGoals } from "./manager-goals";
import { ManagerHome } from "./manager-home";
import { ManagerWorkflow } from "./manager-workflow";
import { managerProfile, managerTasks, replyTask } from "./manager-data";
import styles from "@/app/pilot/manager/manager.module.css";

type ManagerView = "today" | "workflow" | "goals";

export function ManagerWorkspace() {
  const [view, setView] = useState<ManagerView>("today");
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [replyInjected, setReplyInjected] = useState(false);
  const [announcement, setAnnouncement] = useState("Кабинет готов к работе");

  const tasks = useMemo(() => replyInjected ? [replyTask, ...managerTasks] : managerTasks, [replyInjected]);
  const activeTasks = tasks.filter((task) => !completedIds.includes(task.id));
  const currentTask = activeTasks[0];

  const completeTask = (id: string, result = "Задача выполнена") => {
    setCompletedIds((current) => current.includes(id) ? current : [...current, id]);
    setAnnouncement(`${result}. AI подготовил следующий шаг.`);
  };

  const injectReply = () => {
    setReplyInjected(true);
    setCompletedIds((current) => current.filter((id) => id !== replyTask.id));
    setAnnouncement("Клиент ответил. Новая задача поднята в начало потока.");
  };

  return (
    <div className={styles.canvas}>
      <header className={styles.appHeader}>
        <Link className={styles.identity} href="/pilot" aria-label="Вернуться в Business Pulse">
          <span>АО</span>
          <div><strong>АлмаОкна</strong><small>КАБИНЕТ МЕНЕДЖЕРА</small></div>
        </Link>
        <nav aria-label="Разделы кабинета менеджера">
          <button className={view === "today" ? styles.activeNav : ""} onClick={() => setView("today")}><Activity /> Сегодня</button>
          <button className={view === "workflow" ? styles.activeNav : ""} onClick={() => setView("workflow")}><ListChecks /> Поток <b>{activeTasks.length}</b></button>
          <button className={view === "goals" ? styles.activeNav : ""} onClick={() => setView("goals")}><Goal /> Цель и доход</button>
        </nav>
        <div className={styles.headerProfile}>
          <span>ДК</span>
          <div><strong>{managerProfile.name}</strong><small>{managerProfile.branch}</small></div>
          <em><Trophy /> Ур. {managerProfile.level}</em>
        </div>
      </header>

      <p className={styles.srOnly} aria-live="polite">{announcement}</p>
      {view === "today" && <ManagerHome currentTask={currentTask} remaining={activeTasks.length} completed={completedIds.length} onComplete={completeTask} onNoAnswer={(id) => completeTask(id, "Контакт не состоялся — AI назначил повтор")} onOpenWorkflow={() => setView("workflow")} onOpenGoals={() => setView("goals")} onInjectReply={injectReply} />}
      {view === "workflow" && <ManagerWorkflow tasks={tasks} completedIds={completedIds} onComplete={completeTask} onInjectReply={injectReply} />}
      {view === "goals" && <ManagerGoals />}
    </div>
  );
}
