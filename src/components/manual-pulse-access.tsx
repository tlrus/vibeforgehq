"use client";

import { FormEvent, useEffect, useState } from "react";
import { ManualBusinessPulse } from "@/components/manual-business-pulse";
import styles from "@/app/pilot/pilot.module.css";

type AccessState = "checking" | "login" | "ready";

async function getAccessState(): Promise<AccessState> {
  const response = await fetch("/api/manual/session", {
    credentials: "same-origin",
    cache: "no-store",
  });
  return response.ok ? "ready" : "login";
}

export function ManualPulseAccess() {
  const [state, setState] = useState<AccessState>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getAccessState().then((nextState) => {
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
    setState(await getAccessState());
  };

  if (state === "ready") return <ManualBusinessPulse />;

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.mark}>BP</div>
        <p className={styles.eyebrow}>Business Pulse</p>
        <h1>Ручная CRM</h1>
        {state === "checking" ? (
          <p className={styles.message}>Проверяем доступ…</p>
        ) : (
          <form onSubmit={signIn}>
            <label htmlFor="manual-pulse-password">Пароль владельца</label>
            <input
              id="manual-pulse-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              autoFocus
            />
            {error ? <p className={styles.error}>{error}</p> : null}
            <button className={styles.button} type="submit">Открыть Business Pulse</button>
          </form>
        )}
      </section>
    </main>
  );
}
