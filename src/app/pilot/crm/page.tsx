import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPilotSession } from "@/lib/pilot-auth";
import type { PilotStage } from "@/lib/pilot-domain";
import { getPilotCrmRecords } from "@/lib/pilot-crm-data";
import styles from "../../demo/sales-copilot/crm/crm.module.css";

const stageLabels: Record<PilotStage, string> = {
  LEAD: "Заявка",
  DIALOG: "Диалог",
  QUOTE: "КП",
  CONTRACT: "Договор",
  FULFILLMENT: "Исполнение",
  PAYMENT: "Оплачено",
};

const temperatureLabels: Record<string, string> = {
  cold: "Холодный",
  warm: "Тёплый",
  hot: "Горячий",
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default async function PilotCrmPage() {
  const cookieStore = await cookies();
  const role = verifyPilotSession(cookieStore.get("vf_pilot_session")?.value ?? null);
  if (!role) redirect("/pilot");

  const records = await getPilotCrmRecords();
  const businessRecords = records.filter((record) => !record.isPresenterDemo);
  const waiting = businessRecords.filter((record) => record.waitingFor === "business").length;
  const hot = businessRecords.filter((record) => record.customer.temperature === "hot").length;

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/pilot">
          <Image src="/almaokna-mark.svg" alt="" width={44} height={44} />
          <span><strong>АлмаОкна</strong><small>CRM · OWNER VIEW</small></span>
        </Link>
        <nav className={styles.nav}><Link href="/pilot">← Пульс бизнеса</Link></nav>
      </header>
      <section className={styles.content}>
        <div className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Реальные процессы пилота</span>
            <h1>База клиентов</h1>
            <p>Этап, ответственный, контекст сделки и доступ владельца к полной переписке WhatsApp.</p>
          </div>
          <div className={styles.summary}>
            <span><small>В работе</small><strong>{businessRecords.length}</strong></span>
            <span><small>Ждут компанию</small><strong>{waiting}</strong></span>
            <span><small>Горячих</small><strong>{hot}</strong></span>
          </div>
        </div>
        <section className={styles.table} aria-label="Клиенты">
          <div className={`${styles.row} ${styles.heading}`}>
            <span>Клиент</span><span>Этап</span><span>Менеджер</span><span>Намерение</span><span>Понимание диалога</span><span>Следующий шаг</span><span />
          </div>
          {records.map((record) => {
            const stage = record.stage as PilotStage;
            const product = record.productName || "Продукт не указан";
            return (
              <Link className={styles.row} href={`/pilot/crm/${encodeURIComponent(record.id)}`} key={record.id}>
                <span className={styles.person}>
                  <i className={styles.avatar}>{initials(record.customer.name)}</i>
                  <span><strong>{record.customer.name}</strong><small>{record.customer.phoneMasked}</small></span>
                </span>
                <span className={styles.cell}><strong>{stageLabels[stage]}</strong><small>{product}</small></span>
                <span className={styles.cell}><strong>{record.managerName || "Не назначен"}</strong><small>Ответственный</small></span>
                <span className={styles.cell}><span className={styles.temp} data-temperature={record.customer.temperature}>{temperatureLabels[record.customer.temperature] || "Не определено"}</span><small>{record.dialogue.confidence}% уверенности</small></span>
                <span className={styles.cell}><strong>{record.dialogue.intent}</strong><small>{record.lastClientMessage}</small></span>
                <span className={styles.cell}><strong>{record.dialogue.nextStep}</strong><small>Риск: {record.dialogue.objection}</small></span>
                <span className={styles.arrow}>›</span>
              </Link>
            );
          })}
          {records.length === 0 && <p>Клиенты появятся здесь после первого сообщения.</p>}
        </section>
      </section>
    </main>
  );
}
