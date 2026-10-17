"use client";

import {
  BadgeDollarSign,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GitBranch,
  MessageCircleQuestion,
  MessageSquareQuote,
  ShieldCheck,
  Sparkles,
  Target,
  ThermometerSun,
  UserRoundSearch,
} from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import styles from "@/app/demo/sales-copilot/pulse.module.css";
import { productCatalog, type ClientThread, type ProductId } from "@/components/daily-flow-map";

type ScriptId = "price" | "expensive" | "think" | "deadline";

type PersonaDefinition = {
  title: string;
  diagnosis: string;
  situation: string;
  motive: string;
  fear: string;
  decision: string;
  tone: string;
  opening: string;
  avoid: string;
};

type ScriptDefinition = {
  label: string;
  customer: string;
  insight: string;
  answer: string;
  next: string;
  check: string;
  icon: typeof BadgeDollarSign;
};

const personaByProduct: Record<ProductId, PersonaDefinition> = {
  windows: {
    title: "Практичный хозяин квартиры",
    diagnosis: "Покупатель окна ищет не профиль, а предсказуемое тепло без скрытых работ и переноса монтажа.",
    situation: "Дома холодно, дует, шумно или выросли расходы на отопление.",
    motive: "Тепло и тишина с понятной ценой за замер, изготовление и монтаж.",
    fear: "После замера появятся доплаты, а установку перенесут.",
    decision: "Итоговая цена под ключ, подтверждённый срок и гарантия на монтаж.",
    tone: "Спокойно, конкретно, с цифрами и двумя вариантами выбора.",
    opening: "В какой комнате проблема заметнее всего: дует, холодно или мешает шум?",
    avoid: "Не начинать с профиля и фурнитуры — сначала подтвердить проблему и желаемый результат.",
  },
  doors: {
    title: "Покупатель тишины и безопасности",
    diagnosis: "Покупатель двери сравнивает не только внешний вид: ему важно заранее увидеть уровень защиты, тишины и качество монтажа.",
    situation: "Мешает шум, старая дверь не держит тепло или не подходит к интерьеру.",
    motive: "Тишина, надёжный замок, аккуратная установка и подходящий внешний вид.",
    fear: "Дверь окажется красивой, но шумной, а монтаж повредит отделку.",
    decision: "Безопасность, шумоизоляция, отделка и монтаж в согласованный день.",
    tone: "Уверенно и на примерах: показать конструкцию, гарантию и результат монтажа.",
    opening: "Что сейчас важнее всего: убрать шум, сохранить тепло, усилить безопасность или подобрать дизайн?",
    avoid: "Не перечислять комплектацию без связи с задачей клиента.",
  },
  balconies: {
    title: "Создатель полезного пространства",
    diagnosis: "Покупатель балкона хочет получить ещё одну полезную зону, но опасается промерзания и разрастания сметы.",
    situation: "Балкон холодный, сырой и не используется большую часть года.",
    motive: "Получить тёплое полезное пространство под ключ в понятный срок.",
    fear: "Появятся конденсат, промерзание и дополнительные работы вне сметы.",
    decision: "Реальный уровень утепления, полный состав работ и фиксированные границы сметы.",
    tone: "Показывать будущий сценарий использования, этапы работ и ограничения решения.",
    opening: "Как вы хотите использовать балкон зимой: хранение, кабинет или место для отдыха?",
    avoid: "Не обещать тепло до уточнения пола, стен, парапета и типа остекления.",
  },
};

const baseScripts: Record<ScriptId, Omit<ScriptDefinition, "answer" | "next">> = {
  price: {
    label: "Сколько стоит?",
    customer: "«Сколько будет стоить под ключ?»",
    insight: "Клиент просит безопасную границу бюджета. Одной точной суммы без контекста он не доверяет.",
    check: "Есть диапазон, состав цены и один понятный следующий шаг.",
    icon: BadgeDollarSign,
  },
  expensive: {
    label: "Это дорого",
    customer: "«У других дешевле. Почему у вас дороже?»",
    insight: "Клиент боится переплатить. Сначала нужно понять, одинаковый ли состав предложения он сравнивает.",
    check: "Менеджер не спорит и не даёт скидку до сравнения состава.",
    icon: ShieldCheck,
  },
  think: {
    label: "Я подумаю",
    customer: "«Спасибо, я подумаю и напишу.»",
    insight: "Это пауза, а не отказ. За ней обычно скрывается один нерешённый вопрос о цене, сроке или результате.",
    check: "Зафиксирована причина паузы и точное время следующего контакта.",
    icon: MessageCircleQuestion,
  },
  deadline: {
    label: "Когда сделаете?",
    customer: "«Мне нужно закончить всё до определённой даты.»",
    insight: "Срок стал главным критерием решения. Клиент готов двигаться быстрее, если увидит реалистичный план.",
    check: "Срок подтверждён системой, а не обещан менеджером наугад.",
    icon: Clock3,
  },
};

const productScriptAnswers: Record<ProductId, Record<ScriptId, Pick<ScriptDefinition, "answer" | "next">>> = {
  windows: {
    price: {
      answer: "«Чтобы назвать честную вилку, уточню размер окна, материал дома и нужен ли демонтаж. Затем покажу два варианта с монтажом.»",
      next: "Получить размеры или фото → дать два расчёта → назначить замер.",
    },
    expensive: {
      answer: "«Давайте сравним одинаковый состав: профиль, стеклопакет, откосы, демонтаж и гарантию. Что входит в другую цену?»",
      next: "Сверить комплектацию → показать влияние на тепло → выбрать вариант.",
    },
    think: {
      answer: "«Конечно. Что сейчас важнее обдумать: итоговую сумму, срок монтажа или выбранную конструкцию?»",
      next: "Найти сомнение → закрыть его → согласовать дату следующего контакта.",
    },
    deadline: {
      answer: "«Назовите нужную дату. Я проверю ближайший замер и производство, затем подтвержу реальный день монтажа.»",
      next: "Зафиксировать дату → проверить производство → забронировать замер.",
    },
  },
  doors: {
    price: {
      answer: "«Цена зависит от размера, назначения двери и отделки. Это входная или межкомнатная дверь, и монтаж нужен под ключ?»",
      next: "Уточнить проём и назначение → показать два решения → назначить замер.",
    },
    expensive: {
      answer: "«Сравним полотно, шумоизоляцию, замки, отделку и монтаж. Тогда будет видно, за что именно отличается цена.»",
      next: "Сверить защиту и монтаж → показать разницу → выбрать комплектацию.",
    },
    think: {
      answer: "«Подскажите, что пока не даёт решить: внешний вид, безопасность, сумма или срок установки?»",
      next: "Определить критерий → предложить подходящий образец → согласовать возврат.",
    },
    deadline: {
      answer: "«К какой дате нужна готовая дверь? Проверю наличие, изготовление и свободную бригаду, затем подтвержу план.»",
      next: "Проверить склад или производство → забронировать замер и монтаж.",
    },
  },
  balconies: {
    price: {
      answer: "«Чтобы посчитать под ключ, нужно понять размер и будущий сценарий: холодное остекление или тёплая зона. Что вы хотите получить?»",
      next: "Уточнить сценарий → запросить фото → предложить состав работ → замер.",
    },
    expensive: {
      answer: "«Давайте сравним не только окна, но и утепление пола, стен, потолка, отделку и герметизацию. Что включено в другую смету?»",
      next: "Сверить весь контур работ → показать риски исключений → выбрать пакет.",
    },
    think: {
      answer: "«Что сейчас важнее проверить перед решением: будет ли тепло, итоговую смету или длительность работ?»",
      next: "Выявить главный риск → показать релевантный объект → назначить следующий контакт.",
    },
    deadline: {
      answer: "«Назовите дату, к которой балкон должен быть готов. Проверю замер, материалы и график всех этапов без сокращения технологии.»",
      next: "Проверить материалы и бригаду → собрать календарный план → подтвердить дату.",
    },
  },
};

const productColors: Record<ProductId, string> = {
  windows: "#6f9dff",
  doors: "#b68aff",
  balconies: "#51d0ad",
};

const percentage = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;

export function OwnerAiControl({ clients, updatedAt }: { clients: ClientThread[]; updatedAt: string }) {
  const [activeProduct, setActiveProduct] = useState<ProductId>("windows");
  const [scriptId, setScriptId] = useState<ScriptId>("price");

  const productStats = useMemo(() => productCatalog.map((product) => {
    const productClients = clients.filter((client) => client.product === product.id);
    return {
      ...product,
      clients: productClients,
      count: productClients.length,
      active: productClients.filter((client) => client.stage < 6).length,
      hot: productClients.filter((client) => client.temperature === "hot").length,
      qualified: productClients.filter((client) => client.painDetected && client.needDetected).length,
      waiting: productClients.filter((client) => client.stage < 6 && client.waitingForBusiness).length,
    };
  }), [clients]);

  const selectedProduct = productStats.find((product) => product.id === activeProduct) ?? productStats[0];
  const persona = personaByProduct[activeProduct];
  const scopedClients = selectedProduct.clients;
  const hotCount = selectedProduct.hot;
  const warmCount = scopedClients.filter((client) => client.temperature === "warm").length;
  const coldCount = Math.max(scopedClients.length - hotCount - warmCount, 0);
  const confidence = percentage(selectedProduct.qualified, scopedClients.length);
  const activeScript = { ...baseScripts[scriptId], ...productScriptAnswers[activeProduct][scriptId] };
  const ScriptIcon = activeScript.icon;

  return (
    <main className={`${styles.secondaryView} ${styles.aiControlView}`}>
      <header className={styles.aiControlHeader}>
        <div>
          <span><BrainCircuit /> AI-модель бизнеса</span>
          <h1>Как AI понимает продажи</h1>
          <p>Выберите продукт и сразу увидите портрет его покупателя, правильный стиль разговора и сценарий ответа менеджера.</p>
        </div>
        <div className={styles.aiControlStatus}>
          <i />
          <span><strong>{clients.length} процессов в модели</strong><small>данные актуальны · {updatedAt}</small></span>
        </div>
      </header>

      <section className={styles.aiAudienceSection} aria-labelledby="ai-products-title">
        <header>
          <div>
            <span>01 · Направление продаж</span>
            <h2 id="ai-products-title">Что именно анализируем</h2>
            <p>Каждый продукт имеет своего покупателя и отдельную логику разговора.</p>
          </div>
          <span><Sparkles /> Модель меняется вместе с выбором</span>
        </header>

        <div className={styles.aiProductPicker} role="tablist" aria-label="Продукт или услуга">
          {productStats.map((product) => (
            <button
              key={product.id}
              type="button"
              role="tab"
              aria-selected={activeProduct === product.id}
              aria-controls="ai-product-workspace"
              className={activeProduct === product.id ? styles.aiProductActive : ""}
              onClick={() => setActiveProduct(product.id)}
              style={{ "--ai-accent": productColors[product.id] } as CSSProperties}
            >
              <span>{product.label.slice(0, 1)}</span>
              <div>
                <small>{product.short}</small>
                <strong>{product.label}</strong>
                <em>{product.active} в работе · {product.hot} горячих</em>
              </div>
              <b>{product.count}</b>
              <ChevronRight />
            </button>
          ))}
        </div>

        <div
          key={activeProduct}
          id="ai-product-workspace"
          role="tabpanel"
          className={styles.aiProductWorkspace}
          style={{ "--ai-accent": productColors[activeProduct] } as CSSProperties}
        >
          <header className={styles.aiProductSummary}>
            <div>
              <span>{selectedProduct.label} · вывод AI</span>
              <h2>{persona.title}</h2>
              <p>{persona.diagnosis}</p>
            </div>
            <div className={styles.aiProductDecision}>
              <Target />
              <span><small>Что решает покупку</small><strong>{persona.decision}</strong></span>
            </div>
          </header>

          <div className={styles.aiProductMetrics} aria-label={`Сигналы по продукту ${selectedProduct.label}`}>
            <div><UserRoundSearch /><span><small>В анализе</small><strong>{selectedProduct.count}</strong><em>клиентов</em></span></div>
            <div><ThermometerSun /><span><small>Горячие</small><strong>{hotCount}</strong><em>готовы двигаться</em></span></div>
            <div><BrainCircuit /><span><small>Контекст понятен</small><strong>{confidence}%</strong><em>{selectedProduct.qualified} клиентов</em></span></div>
            <div className={selectedProduct.waiting > 0 ? styles.aiSignalAlert : ""}><Clock3 /><span><small>Ждут компанию</small><strong>{selectedProduct.waiting}</strong><em>нужно ответить</em></span></div>
          </div>

          <div className={styles.aiPortraitGrid}>
            <article className={styles.aiPortraitCard}>
              <header><span><UserRoundSearch /></span><div><small>Портрет покупателя</small><h3>Почему выбирают «{selectedProduct.label}»</h3></div></header>
              <div className={styles.aiTemperatureMix}>
                <div aria-label={`${coldCount} холодных, ${warmCount} тёплых, ${hotCount} горячих`}><span style={{ width: `${percentage(coldCount, scopedClients.length)}%` }} /><span style={{ width: `${percentage(warmCount, scopedClients.length)}%` }} /><span style={{ width: `${percentage(hotCount, scopedClients.length)}%` }} /></div>
                <p><b>{coldCount}</b> холодных <b>{warmCount}</b> тёплых <b>{hotCount}</b> горячих</p>
              </div>
              <dl>
                <div><dt>Причина обращения</dt><dd>{persona.situation}</dd></div>
                <div><dt>Что важно в решении</dt><dd>{persona.motive}</dd></div>
                <div><dt>Что мешает купить</dt><dd>{persona.fear}</dd></div>
              </dl>
            </article>

            <article className={styles.aiConversationCard}>
              <header><span><MessageSquareQuote /></span><div><small>Рекомендация AI</small><h3>Как продавать этот продукт</h3></div></header>
              <div className={styles.aiConversationTone}><Sparkles /><span><small>Тон разговора</small><strong>{persona.tone}</strong></span></div>
              <div className={styles.aiOpeningLine}><small>Первый вопрос</small><blockquote>«{persona.opening}»</blockquote></div>
              <div className={styles.aiDoDont}>
                <span><CheckCircle2 /><p><b>Двигать разговор</b>Один вопрос за раз, конкретные цифры и следующий шаг с точным сроком.</p></span>
                <span><ShieldCheck /><p><b>Не перегружать</b>{persona.avoid}</p></span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.aiPlaybookSection} aria-labelledby="ai-playbook-title" style={{ "--ai-accent": productColors[activeProduct] } as CSSProperties}>
        <header>
          <div>
            <span><GitBranch /> 02 · Скрипт для «{selectedProduct.label}»</span>
            <h2 id="ai-playbook-title">Ответ клиента → следующий ход</h2>
            <p>Выберите реплику. AI объяснит её смысл и даст менеджеру короткий ответ.</p>
          </div>
          <div><ShieldCheck /><span><strong>AI только советует</strong><small>Сообщение отправляет менеджер</small></span></div>
        </header>

        <div className={styles.aiReplyTabs} role="tablist" aria-label="Реплика клиента">
          {(Object.entries(baseScripts) as [ScriptId, typeof baseScripts[ScriptId]][]).map(([id, script]) => {
            const Icon = script.icon;
            return (
              <button key={id} type="button" role="tab" aria-selected={scriptId === id} className={scriptId === id ? styles.aiReplyTabActive : ""} onClick={() => setScriptId(id)}>
                <Icon /><span><small>Клиент говорит</small><strong>{script.label}</strong></span>
              </button>
            );
          })}
        </div>

        <div key={`${activeProduct}-${scriptId}`} className={styles.aiFlowchart} aria-live="polite">
          <article className={styles.aiFlowCustomer}>
            <span><ScriptIcon /></span><div><small>01 · Клиент</small><strong>{activeScript.customer}</strong></div>
          </article>
          <ChevronRight className={styles.aiFlowArrow} />
          <article className={styles.aiFlowInsight}>
            <span><BrainCircuit /></span><div><small>02 · Понимание AI</small><strong>{activeScript.insight}</strong></div>
          </article>
          <ChevronRight className={styles.aiFlowArrow} />
          <article className={styles.aiFlowAnswer}>
            <span><MessageSquareQuote /></span><div><small>03 · Ответ менеджера</small><strong>{activeScript.answer}</strong></div>
          </article>
        </div>

        <div className={styles.aiFlowOutcome}>
          <div><Target /><span><small>Следующий шаг</small><strong>{activeScript.next}</strong></span></div>
          <div><CheckCircle2 /><span><small>AI проверит</small><strong>{activeScript.check}</strong></span></div>
        </div>
      </section>
    </main>
  );
}
