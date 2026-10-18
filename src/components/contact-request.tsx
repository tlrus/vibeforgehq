"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
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
    const text = ["Здравствуйте, Руслан! Хочу обсудить проект с VibeForge.",
      `Имя: ${String(data.get("name") ?? "").trim()}`,
      `Телефон: ${phone}`,
      `Задача: ${String(data.get("message") ?? "").trim() || "Обсудим в переписке"}`].join("\n");
    window.location.assign(`https://wa.me/77081102995?text=${encodeURIComponent(text)}`);
  }
  return <div className={styles.contact}>
        <div>
          <form onSubmit={submit} className={styles.form}>
            <label htmlFor="contact-name">Ваше имя<input id="contact-name" name="name" autoComplete="name" required maxLength={100} placeholder="Как к вам обращаться" /></label>
            <label htmlFor="contact-phone">Номер телефона<input id="contact-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={25} placeholder="+7 700 123 45 67" aria-describedby={error ? "phone-error" : undefined} aria-invalid={Boolean(error)} onChange={() => setError("")} /></label>
            <label htmlFor="contact-message">Что хотите улучшить? <span>Необязательно</span><textarea id="contact-message" name="message" rows={3} maxLength={1500} placeholder="Идея, задача, сроки. Можно своими словами." /></label>
            {error && <p id="phone-error" role="alert" className={styles.error}>{error}</p>}
            <button type="submit">Подготовить заявку в WhatsApp ↗</button>
            <p className={styles.note}>Откроется WhatsApp с вашим текстом. Для отправки нажмите «Отправить» в чате. До этого форма не отправляет и не сохраняет ваши данные.</p>
          </form>
        </div>
        <details className={styles.qr}><summary>Показать QR-код WhatsApp</summary><a href="https://wa.me/qr/BT35IQF7XT66E1" aria-label="Открыть контакт Руслана в WhatsApp"><Image src="/whatsapp-ruslan.png" alt="QR-код WhatsApp Руслана" width={1320} height={2868} unoptimized /></a><p>Отсканируйте QR-код камерой WhatsApp или нажмите на него.</p></details>
  </div>;
}
