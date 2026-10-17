"use client";

import { FormEvent, useEffect, useState } from "react";
import { ManagerWorkspace } from "./manager-workspace";
import loginStyles from "@/app/pilot/pilot.module.css";

type AccessState = "checking" | "login" | "ready";

async function getAccessState(): Promise<AccessState> {
  const response = await fetch("/api/manual/session", { credentials: "same-origin", cache: "no-store" });
  return response.ok ? "ready" : "login";
}

export function ManagerAccess() {
  const [state, setState] = useState<AccessState>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getAccessState().then((next) => { if (!cancelled) setState(next); });
    return () => { cancelled = true; };
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

  if (state === "ready") return <ManagerWorkspace />;

  return (
    <main className={loginStyles.page}>
      <section className={loginStyles.card}>
        <div className={loginStyles.mark}>АО</div>
        <p className={loginStyles.eyebrow}>АлмаОкна · менеджер</p>
        <h1>Личный кабинет продаж</h1>
        {state === "checking" ? <p className={loginStyles.message}>Проверяем доступ…</p> : (
          <form onSubmit={signIn}>
            <label htmlFor="manager-password">Пароль менеджера или владельца</label>
            <input id="manager-password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" autoFocus />
            {error ? <p className={loginStyles.error}>{error}</p> : null}
            <button className={loginStyles.button} type="submit">Открыть кабинет</button>
          </form>
        )}
      </section>
    </main>
  );
}
