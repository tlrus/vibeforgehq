import Image from "next/image";
import Link from "next/link";
import { getPulseClientIdentity, temperatureLabel, type PulseProduct } from "@/lib/pulse-client";
import styles from "../crm.module.css";

const stageLabels = ["Заявка", "Диалог", "КП", "Договор", "Исполнение", "Принято", "Оплачено"];
const productLabels: Record<PulseProduct, string> = { windows: "Окна", doors: "Двери", balconies: "Балконы" };
const branchLabels = ["Абая", "Mega", "Орбита", "Туран"];
const validProducts = new Set<PulseProduct>(["windows", "doors", "balconies"]);
const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2);

export default async function PulseCrmClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ product?: string; stage?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const product = validProducts.has(query.product as PulseProduct) ? query.product as PulseProduct : "windows";
  const stage = Math.min(6, Math.max(0, Number(query.stage) || 0));
  const client = getPulseClientIdentity(id, product, stage);
  const seed = Number(id.replace(/\D/g, "")) || 1;

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/demo/sales-copilot"><Image src="/almaokna-mark.svg" alt="" width={44} height={44} /><span><strong>АлмаОкна</strong><small>CRM · OWNER VIEW</small></span></Link>
        <nav className={styles.nav}><Link href="/demo/sales-copilot/crm">← Все клиенты</Link><Link href="/demo/sales-copilot">Пульс бизнеса</Link>{process.env.NEXT_PUBLIC_TWENTY_URL && <a className={styles.primary} href={process.env.NEXT_PUBLIC_TWENTY_URL} target="_blank" rel="noreferrer">Открыть в Twenty ↗</a>}</nav>
      </header>
      <section className={styles.content}>
        <span className={styles.eyebrow}>{id} · {productLabels[product]}</span>
        <div className={styles.profileGrid}>
          <article className={styles.card}>
            <header className={styles.profileHead}><i className={styles.avatar}>{initials(client.name)}</i><div><h1>{client.name}</h1><p>{client.phoneMasked} · этап «{stageLabels[stage]}»</p></div></header>
            <div className={styles.stageLine} aria-label={`Прогресс сделки: ${stageLabels[stage]}`}>{stageLabels.map((label, index) => <span key={label} data-complete={index <= stage} title={label} />)}</div>
            <dl className={styles.facts}>
              <div><dt>Боль клиента</dt><dd>{client.painSummary}</dd></div>
              <div><dt>Потребность</dt><dd>{client.needSummary}</dd></div>
              <div><dt>Температура лида</dt><dd><span className={styles.temp} data-temperature={client.temperature}>{temperatureLabel[client.temperature]}</span></dd></div>
              <div><dt>Следующее действие</dt><dd>{stage === 0 ? "Ответить на обращение" : stage === 1 ? "Закрыть квалификацию" : stage === 2 ? "Согласовать КП" : "Продвинуть процесс по этапу"}</dd></div>
            </dl>
            <Link className={styles.privacy} href={`/demo/sales-copilot?view=conversations&client=${encodeURIComponent(id)}&manager=${encodeURIComponent(client.manager)}`}>Открыть полную переписку WhatsApp →</Link>
          </article>
          <aside className={`${styles.card} ${styles.sideCard}`}>
            <h2>Ответственность</h2><p>Данные, по которым владелец понимает, кто должен сделать следующий шаг.</p>
            <dl>
              <div><dt>Менеджер</dt><dd>{client.manager}</dd></div>
              <div><dt>Точка</dt><dd>{branchLabels[seed % branchLabels.length]}</dd></div>
              <div><dt>Продукт</dt><dd>{productLabels[product]}</dd></div>
              <div><dt>Текущий этап</dt><dd>{stageLabels[stage]}</dd></div>
              <div><dt>Боль выявлена</dt><dd>{client.painDetected ? "Да" : "Нет"}</dd></div>
              <div><dt>Потребность ясна</dt><dd>{client.needDetected ? "Да" : "Нет"}</dd></div>
            </dl>
            <div className={styles.twentyStatus}><span>{process.env.NEXT_PUBLIC_TWENTY_URL ? "Связано с Twenty CRM" : "Twenty CRM подготовлена к запуску"}</span><i /></div>
          </aside>
        </div>
      </section>
    </main>
  );
}
