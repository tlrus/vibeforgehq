"use client";

import { FormEvent, useEffect, useState } from "react";
import { BusinessPulseDemo } from "./business-pulse-demo";
import styles from "@/app/pilot/pilot.module.css";

type AccessState = "checking" | "login" | "ready" | "database_error";

async function fetchPilotAccessState(): Promise<AccessState> {
  const response = await fetch("/api/pilot/snapshot", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (response.ok) return "ready";
  if (response.status === 503) return "database_error";
  return "login";
}

export function PilotAccess() {
  const [state, setState] = useState<AccessState>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchPilotAccessState().then((nextState) => {
      if (!cancelled) setState(nextState);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/pilot/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setError("Неверный пароль");
      return;
    }
    setState(await fetchPilotAccessState());
  };

  if (state === "ready") return <BusinessPulseDemo liveMode />;

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.mark}>VF</div>
        <p className={styles.eyebrow}>VibeForge Pilot</p>
        <h1>Живой пульс продаж</h1>
        {state === "checking" ? (
          <p className={styles.message}>Проверяем доступ…</p>
        ) : state === "database_error" ? (
          <>
            <p className={styles.message}>
              Интерфейс готов, но база пилота ещё не подключена.
            </p>
            <button
              className={styles.button}
              onClick={() => void fetchPilotAccessState().then(setState)}
            >
              Проверить снова
            </button>
          </>
        ) : (
          <form onSubmit={signIn}>
            <label htmlFor="pilot-password">Пароль владельца или менеджера</label>
            <input
              id="pilot-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              autoFocus
            />
            {error ? <p className={styles.error}>{error}</p> : null}
            <button className={styles.button} type="submit">
              Открыть пилот
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
