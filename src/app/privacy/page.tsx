import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Политика конфиденциальности — VibeForge Pilot",
  description: "Правила обработки данных в пилотной версии VibeForge Business Pulse.",
};

const sectionStyle = {
  paddingTop: "28px",
  borderTop: "1px solid rgba(255,255,255,.1)",
} as const;

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#0b0d10", color: "#f5f5f7", fontFamily: "var(--font-geist-sans), Arial, sans-serif", padding: "72px 24px" }}>
      <article style={{ width: "min(760px, 100%)", margin: "0 auto" }}>
        <a href="/pilot" style={{ color: "#8ab4ff", textDecoration: "none" }}>← VibeForge Pilot</a>
        <p style={{ margin: "48px 0 12px", color: "#8ab4ff", fontWeight: 700 }}>VIBEFORGE PILOT</p>
        <h1 style={{ margin: 0, fontSize: "clamp(36px, 7vw, 64px)", lineHeight: 1.02 }}>Политика конфиденциальности</h1>
        <p style={{ margin: "22px 0 48px", color: "#a1a1aa", fontSize: 18 }}>Обновлено 28 июля 2026 года</p>
        <div style={{ display: "grid", gap: 32, color: "#d4d4d8", fontSize: 17, lineHeight: 1.7 }}>
          <section style={sectionStyle}><h2 style={{ color: "#fff", marginTop: 0 }}>1. О сервисе</h2><p>VibeForge Pilot помогает компании видеть этапы клиентского процесса, контролировать сроки ответа и получать AI-подсказки. Сервис не отправляет сообщения клиенту автоматически: итоговое действие выполняет сотрудник компании.</p></section>
          <section style={sectionStyle}><h2 style={{ color: "#fff", marginTop: 0 }}>2. Какие данные обрабатываются</h2><p>В рамках пилота могут обрабатываться имя и идентификатор клиента, номер WhatsApp, содержание деловой переписки, источник рекламной заявки, ответственный менеджер, этап сделки, сроки действий и технические события интеграций. Пароли, платёжные реквизиты и секретные ключи в интерфейсе владельца не показываются.</p></section>
          <section style={sectionStyle}><h2 style={{ color: "#fff", marginTop: 0 }}>3. Для чего используются данные</h2><p>Данные используются для доставки сообщений, ведения клиентского процесса, определения текущего этапа сделки, контроля обещаний компании, формирования подсказок менеджеру, аналитики рекламы и диагностики работы пилота.</p></section>
          <section style={sectionStyle}><h2 style={{ color: "#fff", marginTop: 0 }}>4. Передача и хранение</h2><p>Данные передаются только подключённым для пилота поставщикам инфраструктуры и API в объёме, необходимом для работы сервиса. Доступ ограничен уполномоченными сотрудниками. Данные хранятся в течение пилота и разумного срока для устранения ошибок, после чего удаляются или обезличиваются.</p></section>
          <section style={sectionStyle}><h2 style={{ color: "#fff", marginTop: 0 }}>5. Права пользователя и удаление</h2><p>Пользователь может запросить сведения об обработке, исправление или удаление данных. Для запроса напишите на <a href="mailto:pilot@vibeforgehq.com" style={{ color: "#8ab4ff" }}>pilot@vibeforgehq.com</a>. В обращении достаточно указать связанный с пилотом контакт и суть запроса; не отправляйте пароли или коды подтверждения.</p></section>
          <section style={sectionStyle}><h2 style={{ color: "#fff", marginTop: 0 }}>6. Изменения политики</h2><p>При изменении состава интеграций или логики обработки актуальная версия политики публикуется на этой странице с новой датой обновления.</p></section>
        </div>
      </article>
    </main>
  );
}
