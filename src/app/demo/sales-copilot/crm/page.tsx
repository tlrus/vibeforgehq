import Image from "next/image";
import Link from "next/link";
import { getPulseClientIdentity, temperatureLabel, type PulseProduct } from "@/lib/pulse-client";
import styles from "./crm.module.css";

const stages = ["Заявка", "Диалог", "КП", "Договор", "Исполнение", "Принято", "Оплачено"];
const products: PulseProduct[] = ["windows", "doors", "balconies"];
const productLabel: Record<PulseProduct, string> = { windows: "Окна", doors: "Двери", balconies: "Балконы" };

const records = Array.from({ length: 24 }, (_, index) => {
  const id = `VF-${1843 + index}`;
  const product = products[index % products.length];
  const stage = Math.min(6, Math.floor(index / 4));
  return { id, product, stage, ...getPulseClientIdentity(id, product, stage) };
});

const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2);

export default function PulseCrmPage() {
  const waiting = records.filter((record) => record.stage < 6 && record.painDetected && record.needDetected).length;
  const hot = records.filter((record) => record.temperature === "hot").length;
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/demo/sales-copilot"><Image src="/almaokna-mark.svg" alt="" width={44} height={44} /><span><strong>АлмаОкна</strong><small>CRM · OWNER VIEW</small></span></Link>
        <nav className={styles.nav}><Link href="/demo/sales-copilot">← Пульс бизнеса</Link>{process.env.NEXT_PUBLIC_TWENTY_URL && <a className={styles.primary} href={process.env.NEXT_PUBLIC_TWENTY_URL} target="_blank" rel="noreferrer">Открыть Twenty ↗</a>}</nav>
      </header>
      <section className={styles.content}>
        <div className={styles.hero}>
          <div><span className={styles.eyebrow}>Клиенты всей сети</span><h1>База клиентов</h1><p>Этап, ответственный менеджер, контекст сделки и доступ владельца к полной переписке WhatsApp.</p></div>
          <div className={styles.summary}><span><small>В работе</small><strong>{records.filter((record) => record.stage < 6).length}</strong></span><span><small>Квалифицировано</small><strong>{waiting}</strong></span><span><small>Горячих</small><strong>{hot}</strong></span></div>
        </div>
        <section className={styles.table} aria-label="Клиенты">
          <div className={`${styles.row} ${styles.heading}`}><span>Клиент</span><span>Этап</span><span>Менеджер</span><span>Намерение</span><span>Потребность</span><span /></div>
          {records.map((record) => (
            <Link className={styles.row} href={`/demo/sales-copilot/crm/${record.id}?product=${record.product}&stage=${record.stage}`} key={record.id}>
              <span className={styles.person}><i className={styles.avatar}>{initials(record.name)}</i><span><strong>{record.name}</strong><small>{record.id} · {record.phoneMasked}</small></span></span>
              <span className={styles.cell}><strong>{stages[record.stage]}</strong><small>{productLabel[record.product]}</small></span>
              <span className={styles.cell}><strong>{record.manager}</strong><small>Ответственный</small></span>
              <span className={styles.temp} data-temperature={record.temperature}>{temperatureLabel[record.temperature]}</span>
              <span className={styles.cell}><strong>{record.needSummary}</strong><small>{record.painSummary}</small></span>
              <span className={styles.arrow}>›</span>
            </Link>
          ))}
        </section>
      </section>
    </main>
  );
}
