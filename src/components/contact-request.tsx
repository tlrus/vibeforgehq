"use client";

import { useState, type FormEvent } from "react";
import styles from "./contact-request.module.css";

export function ContactRequest() {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const phone = String(data.get("phone") ?? "").trim();
    if (!/^[+\d\s()-]+$/.test(phone) || phone.replace(/\D/g, "").length < 10 || phone.replace(/\D/g, "").length > 15) {
      setError("Укажите номер телефона с кодом страны, например +7 700 123 45 67.");
      return;
    }
    setError("");
    const text = ["Здравствуйте, Руслан! Хочу обсудить внедрение Business Pulse.",
      `Имя: ${String(data.get("name") ?? "").trim()}`,
      `Телефон: ${phone}`,
      `Задача: ${String(data.get("message") ?? "").trim() || "Обсудим в переписке"}`].join("\n");
    window.location.assign(`https://wa.me/77081102995?text=${encodeURIComponent(text)}`);
  }
  return <div className={styles.page}>
    <header className={styles.header}><a href="/" className={styles.brand}>VibeForge<span>Business Pulse</span></a><a href="tel:+77081102995">+7 708 110 29 95</a></header>
    <main className={styles.main}>
      <section className={styles.intro}><p className={styles.eyebrow}>На связи — Руслан</p><h1>Договорённости<br />не должны теряться.</h1><p>Обсудим, как связать обращения, работу команды и следующие шаги с клиентами в Business Pulse.</p><a className={styles.direct} href="https://wa.me/77081102995">Написать в WhatsApp ↗</a></section>
      <section className={styles.contact} aria-labelledby="request-title">
        <div><h2 id="request-title">Обсудить вашу задачу</h2><p>Оставьте контакты в сообщении Руслану.</p>
          <form onSubmit={submit} className={styles.form}>
            <label htmlFor="contact-name">Ваше имя<input id="contact-name" name="name" autoComplete="name" required maxLength={100} placeholder="Как к вам обращаться" /></label>
            <label htmlFor="contact-phone">Номер телефона<input id="contact-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={25} placeholder="+7 700 123 45 67" aria-describedby={error ? "phone-error" : undefined} aria-invalid={Boolean(error)} onChange={() => setError("")} /></label>
            <label htmlFor="contact-message">Что хотите улучшить? <span>Необязательно</span><textarea id="contact-message" name="message" rows={3} maxLength={1500} placeholder="Например, не терять заявки и видеть обещания менеджеров" /></label>
            {error && <p id="phone-error" role="alert" className={styles.error}>{error}</p>}
            <button type="submit">Подготовить заявку в WhatsApp ↗</button>
            <p className={styles.note}>Откроется WhatsApp с вашим текстом. Для отправки нажмите «Отправить» в чате. До этого форма не отправляет и не сохраняет ваши данные.</p>
          </form>
        </div>
        <aside className={styles.qr}><a href="https://wa.me/qr/BT35IQF7XT66E1" aria-label="Открыть контакт Руслана в WhatsApp"><img src="/whatsapp-ruslan.png" alt="QR-код WhatsApp Руслана" width={1320} height={2868} /></a><h3>Удобнее с телефона?</h3><p>Отсканируйте QR-код камерой WhatsApp или нажмите на него.</p><a href="tel:+77081102995">+7 708 110 29 95</a></aside>
      </section>
    </main>
    <footer className={styles.footer}><span>VibeForge · Business Pulse</span><a href="/privacy">Конфиденциальность</a><a href="/business-pulse">Вход в CRM</a></footer>
  </div>;
}
