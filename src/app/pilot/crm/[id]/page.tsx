import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { verifyPilotSession } from "@/lib/pilot-auth";
import { getPilotCrmRecords } from "@/lib/pilot-crm-data";
import { PILOT_STAGES, type PilotStage } from "@/lib/pilot-domain";
import styles from "../../../demo/sales-copilot/crm/crm.module.css";

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

function nextAction(stage: PilotStage, waitingFor: "business" | "customer" | null) {
  if (waitingFor === "business") return "Выполнить обещанное действие компании";
  if (waitingFor === "customer") return "Ожидается ответ клиента";
  if (stage === "DIALOG") return "Закрыть квалификацию";
  if (stage === "QUOTE") return "Согласовать КП";
  if (stage === "CONTRACT") return "Согласовать и подписать договор";
  if (stage === "FULFILLMENT") return "Завершить исполнение и получить оплату";
  if (stage === "PAYMENT") return "Процесс завершён";
  return "Ответить на обращение";
}

export default async function PilotCrmClientPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const role = verifyPilotSession(cookieStore.get("vf_pilot_session")?.value ?? null);
  if (!role) redirect("/pilot");

  const { id } = await params;
  const records = await getPilotCrmRecords();
  const client = records.find((process) => process.id === id);
  if (!client) notFound();

  const stage = client.stage as PilotStage;
  const stageIndex = PILOT_STAGES.indexOf(stage);

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/pilot">
          <Image src="/almaokna-mark.svg" alt="" width={44} height={44} />
          <span><strong>АлмаОкна</strong><small>CRM · OWNER VIEW</small></span>
        </Link>
        <nav className={styles.nav}><Link href="/pilot/crm">← Все клиенты</Link><Link href="/pilot">Пульс бизнеса</Link></nav>
      </header>
      <section className={styles.content}>
        <span className={styles.eyebrow}>{client.id} · {client.productName || "Продукт не указан"}</span>
        <div className={styles.profileGrid}>
          <article className={styles.card}>
            <header className={styles.profileHead}>
              <i className={styles.avatar}>{initials(client.customer.name)}</i>
              <div><h1>{client.customer.name}</h1><p>{client.customer.phoneMasked} · этап «{stageLabels[stage]}»</p></div>
            </header>
            <div className={styles.stageLine} aria-label={`Прогресс сделки: ${stageLabels[stage]}`}>
              {PILOT_STAGES.map((item, index) => <span key={item} data-complete={index <= stageIndex} title={stageLabels[item]} />)}
            </div>
            <dl className={styles.facts}>
              <div><dt>Что понял из диалога</dt><dd>{client.dialogue.summary}</dd></div>
              <div><dt>Намерение клиента</dt><dd>{client.dialogue.intent}</dd></div>
              <div><dt>Причина покупки</dt><dd>{client.customer.painSummary || "Ещё не выявлена"}</dd></div>
              <div><dt>Потребность</dt><dd>{client.customer.needSummary || "Ещё не выявлена"}</dd></div>
              <div><dt>Размеры / объём</dt><dd>{client.dialogue.dimensions}</dd></div>
              <div><dt>Бюджет</dt><dd>{client.dialogue.budget}</dd></div>
              <div><dt>Желаемый срок</dt><dd>{client.dialogue.timeline}</dd></div>
              <div><dt>Критерии решения</dt><dd>{client.dialogue.decisionCriteria}</dd></div>
              <div><dt>Возражение или риск</dt><dd>{client.dialogue.objection}</dd></div>
              <div><dt>Рекомендованный следующий шаг</dt><dd>{client.dialogue.nextStep}</dd></div>
              <div><dt>Температура лида</dt><dd><span className={styles.temp} data-temperature={client.customer.temperature}>{temperatureLabels[client.customer.temperature] || "Не определено"}</span></dd></div>
              <div><dt>Качество понимания</dt><dd>{client.dialogue.confidence}% · факты подтверждены перепиской</dd></div>
            </dl>
            {role === "owner" ? (
              <Link className={styles.privacy} href={`/pilot?view=conversations&client=${encodeURIComponent(client.id)}&manager=${encodeURIComponent(client.managerName || "Не назначен")}`}>
                Открыть полную переписку WhatsApp →
              </Link>
            ) : (
              <div className={styles.privacy}>Менеджер видит только назначенные ему рабочие диалоги.</div>
            )}
          </article>
          <aside className={`${styles.card} ${styles.sideCard}`}>
            <h2>Ответственность</h2>
            <p>Кто должен сделать следующий шаг и как давно процесс ждёт.</p>
            <dl>
              <div><dt>Менеджер</dt><dd>{client.managerName || "Не назначен"}</dd></div>
              <div><dt>Точка</dt><dd>{client.locationName || "Не указана"}</dd></div>
              <div><dt>Продукт</dt><dd>{client.productName || "Не указан"}</dd></div>
              <div><dt>Текущий этап</dt><dd>{stageLabels[stage]}</dd></div>
              <div><dt>Ждём</dt><dd>{client.waitingFor === "business" ? "Компанию" : client.waitingFor === "customer" ? "Клиента" : "Никого"}</dd></div>
              <div><dt>Время ожидания</dt><dd>{client.waitingMinutes} мин</dd></div>
              <div><dt>Операционное действие</dt><dd>{nextAction(stage, client.waitingFor as "business" | "customer" | null)}</dd></div>
            </dl>
            <div className={styles.twentyStatus}><span>Данные синхронизированы с живым процессом</span><i /></div>
          </aside>
        </div>
      </section>
    </main>
  );
}
