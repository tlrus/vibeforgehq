"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDown,
  BarChart3,
  Bell,
  Bot,
  Check,
  CheckCheck,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FileText,
  Filter,
  Inbox,
  Info,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
  Target,
  UserRound,
  Users,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import styles from "@/app/demo/sales-copilot/demo.module.css";

type View = "inbox" | "dashboard";
type Sender = "client" | "manager";
type Message = { id: number; sender: Sender; text: string; time: string; status?: "read" | "sent" };
type Conversation = {
  id: string;
  name: string;
  initials: string;
  phone: string;
  preview: string;
  time: string;
  unread: number;
  stage: string;
  temperature: "hot" | "warm" | "cold";
  source: string;
  manager: string;
  amount: string;
  product: string;
  color: string;
  messages: Message[];
};

const baseConversations: Conversation[] = [
  {
    id: "aigul",
    name: "Айгуль Сарсенова",
    initials: "АС",
    phone: "+7 701 ••• 42 18",
    preview: "А монтаж в эту сумму входит?",
    time: "10:42",
    unread: 1,
    stage: "КП отправлено",
    temperature: "hot",
    source: "Instagram",
    manager: "Данияр",
    amount: "1 240 000 ₸",
    product: "ПВХ-окна, 7 шт.",
    color: "#E4F2EC",
    messages: [
      { id: 1, sender: "client", text: "Добрый день! Нужны окна в дом, примерно 7 штук. Тёплые, под ключ.", time: "09:48" },
      { id: 2, sender: "manager", text: "Айгуль, добрый день! Да, поможем. Подскажите, пожалуйста, район и примерные размеры проёмов?", time: "09:51", status: "read" },
      { id: 3, sender: "client", text: "Каскелен. Размеры отправляла вчера в Instagram. Дом из газоблока.", time: "09:54" },
      { id: 4, sender: "manager", text: "Нашёл. Предварительный расчёт на профиль 70 мм и двухкамерный стеклопакет — 1 240 000 тенге.", time: "10:04", status: "read" },
      { id: 5, sender: "client", text: "А монтаж в эту сумму входит? И сколько ждать после замера?", time: "10:42" },
    ],
  },
  {
    id: "nurlan",
    name: "Нурлан Абдрахманов",
    initials: "НА",
    phone: "+7 777 ••• 09 31",
    preview: "Хорошо, я подумаю",
    time: "10:18",
    unread: 0,
    stage: "Квалификация",
    temperature: "warm",
    source: "WhatsApp",
    manager: "Алина",
    amount: "680 000 ₸",
    product: "Балконный блок",
    color: "#E8ECF8",
    messages: [
      { id: 1, sender: "client", text: "Сколько будет балконный блок в панельный дом?", time: "09:35" },
      { id: 2, sender: "manager", text: "От 620 тысяч, зависит от профиля и размеров.", time: "10:17", status: "read" },
      { id: 3, sender: "client", text: "Хорошо, я подумаю", time: "10:18" },
    ],
  },
  {
    id: "elmira",
    name: "Эльмира К.",
    initials: "ЭК",
    phone: "+7 705 ••• 61 04",
    preview: "Можно замер на субботу?",
    time: "09:56",
    unread: 2,
    stage: "Замер",
    temperature: "hot",
    source: "Сайт",
    manager: "Данияр",
    amount: "920 000 ₸",
    product: "Лоджия + 3 окна",
    color: "#F4E9DB",
    messages: [
      { id: 1, sender: "manager", text: "Предварительный расчёт готов. Следующий шаг — бесплатный замер.", time: "Вчера", status: "read" },
      { id: 2, sender: "client", text: "Можно замер на субботу? Желательно после обеда.", time: "09:56" },
    ],
  },
  {
    id: "ruslan",
    name: "Руслан Т.",
    initials: "РТ",
    phone: "+7 747 ••• 22 70",
    preview: "Спасибо, договор получил",
    time: "Вчера",
    unread: 0,
    stage: "Договор",
    temperature: "cold",
    source: "Рекомендация",
    manager: "Алина",
    amount: "1 860 000 ₸",
    product: "Коттедж, 11 окон",
    color: "#E4EFF1",
    messages: [
      { id: 1, sender: "manager", text: "Руслан, направляю договор и приложение с комплектацией.", time: "Вчера", status: "read" },
      { id: 2, sender: "client", text: "Спасибо, договор получил", time: "Вчера" },
    ],
  },
];

const stageOptions = ["Входящий", "Квалификация", "КП отправлено", "Замер", "Договор"];

export function SalesCopilotDemo() {
  const [view, setView] = useState<View>("inbox");
  const [conversations, setConversations] = useState(baseConversations);
  const [selectedId, setSelectedId] = useState("aigul");
  const [composer, setComposer] = useState("");
  const [suggestion, setSuggestion] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [toast, setToast] = useState("");
  const [alertOpen, setAlertOpen] = useState(true);
  const [query, setQuery] = useState("");
  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0];

  const filteredConversations = useMemo(
    () => conversations.filter((conversation) => conversation.name.toLowerCase().includes(query.toLowerCase())),
    [conversations, query],
  );

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const updateStage = (stage: string) => {
    setConversations((items) => items.map((item) => (item.id === selected.id ? { ...item, stage } : item)));
    flash(`Этап сделки изменён: ${stage}`);
  };

  const sendMessage = () => {
    if (!composer.trim()) return;
    const nextMessage: Message = {
      id: Date.now(),
      sender: "manager",
      text: composer.trim(),
      time: "сейчас",
      status: "sent",
    };
    setConversations((items) =>
      items.map((item) =>
        item.id === selected.id
          ? { ...item, messages: [...item.messages, nextMessage], preview: composer.trim(), time: "сейчас", unread: 0 }
          : item,
      ),
    );
    setComposer("");
    setSuggestion(false);
    flash("Сообщение добавлено в демо-диалог");
  };

  const runScenario = () => {
    setView("inbox");
    setSelectedId("aigul");
    setAnalyzing(true);
    setSuggestion(false);
    flash("Получено новое сообщение из WhatsApp");
    window.setTimeout(() => {
      setConversations((items) =>
        items.map((item) =>
          item.id === "aigul"
            ? {
                ...item,
                preview: "Если сегодня замер, когда установите?",
                time: "сейчас",
                unread: 1,
                messages: item.messages.some((message) => message.id === 999)
                  ? item.messages
                  : [...item.messages, { id: 999, sender: "client", text: "Если сегодня сделать замер, когда сможете установить?", time: "сейчас" }],
              }
            : item,
        ),
      );
    }, 450);
    window.setTimeout(() => {
      setAnalyzing(false);
      setSuggestion(true);
      flash("AI-Суфлёр подготовил ответ");
    }, 1450);
  };

  return (
    <div className={styles.app}>
      <aside className={styles.rail} aria-label="Навигация">
        <div className={styles.brandMark}>V</div>
        <nav>
          <button className={view === "inbox" ? styles.railActive : ""} onClick={() => setView("inbox")} aria-label="Диалоги">
            <Inbox />
            <span>5</span>
          </button>
          <button className={view === "dashboard" ? styles.railActive : ""} onClick={() => setView("dashboard")} aria-label="Дашборд">
            <LayoutDashboard />
          </button>
          <button aria-label="Контакты"><Users /></button>
          <button aria-label="Отчёты"><BarChart3 /></button>
        </nav>
        <div className={styles.railBottom}>
          <button aria-label="Уведомления"><Bell /><i /></button>
          <button aria-label="Настройки"><Settings /></button>
          <div className={styles.avatarSmall}>ДМ</div>
        </div>
      </aside>

      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.wordmark}>
            <strong>VibeForge</strong>
            <span>Sales Copilot</span>
          </div>
          <div className={styles.workspaceSelect}>
            <span className={styles.companyLogo}>АО</span>
            <div><strong>АлмаОкна</strong><small>Рабочее пространство</small></div>
            <ChevronDown />
          </div>
          <div className={styles.topbarActions}>
            <div className={styles.liveBadge}><i /> Система работает</div>
            <button className={styles.scenarioButton} onClick={runScenario}><Play /> Запустить сценарий</button>
            <button className={styles.iconButton} onClick={() => flash("Демо восстановлено")} aria-label="Сбросить демо"><RefreshCw /></button>
          </div>
        </header>

        <div className={styles.demoNotice}><Info /> Демо-режим: используются вымышленные клиенты. Сообщения никуда не отправляются.</div>

        {view === "inbox" ? (
          <main className={styles.inboxLayout}>
            <section className={styles.conversationList}>
              <div className={styles.listHead}>
                <div><h1>Диалоги</h1><span>12 открытых</span></div>
                <button className={styles.newButton} aria-label="Новый диалог"><Plus /></button>
              </div>
              <label className={styles.searchBox}>
                <Search />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск клиента" />
                <kbd>⌘ K</kbd>
              </label>
              <div className={styles.listFilters}>
                <button className={styles.filterActive}>Все <span>12</span></button>
                <button>Мои <span>7</span></button>
                <button aria-label="Фильтры"><Filter /></button>
              </div>
              <div className={styles.listCaption}><span>Сначала требуют ответа</span><ArrowDown /></div>
              <div className={styles.conversationScroll}>
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    className={`${styles.conversationItem} ${conversation.id === selected.id ? styles.conversationActive : ""}`}
                    onClick={() => { setSelectedId(conversation.id); setSuggestion(conversation.id === "aigul"); }}
                  >
                    <div className={styles.avatar} style={{ background: conversation.color }}>{conversation.initials}<i className={styles.whatsappDot}><MessageCircle /></i></div>
                    <div className={styles.conversationCopy}>
                      <div><strong>{conversation.name}</strong><time>{conversation.time}</time></div>
                      <p>{conversation.preview}</p>
                      <div><span className={`${styles.tempDot} ${styles[conversation.temperature]}`} /> <small>{conversation.stage}</small>{conversation.unread > 0 && <b>{conversation.unread}</b>}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.chatPanel}>
              <header className={styles.chatHead}>
                <div className={styles.avatar} style={{ background: selected.color }}>{selected.initials}</div>
                <div className={styles.chatIdentity}><strong>{selected.name}</strong><span><i /> WhatsApp · был(а) недавно</span></div>
                <div className={styles.chatActions}>
                  <button aria-label="Позвонить"><Phone /></button>
                  <button aria-label="Действия"><MoreHorizontal /></button>
                </div>
              </header>
              <div className={styles.stageBar}>
                <span>Этап сделки</span>
                <div className={styles.stageSteps}>
                  {stageOptions.map((stage, index) => {
                    const activeIndex = stageOptions.indexOf(selected.stage);
                    return <button key={stage} onClick={() => updateStage(stage)} className={index <= activeIndex ? styles.stageDone : ""} title={stage}><i /></button>;
                  })}
                </div>
                <button className={styles.stageName}>{selected.stage}<ChevronDown /></button>
              </div>
              <div className={styles.messageArea}>
                <div className={styles.dateDivider}><span>Сегодня</span></div>
                <div className={styles.systemEvent}><Zap /> Контакт создан из Instagram · AI объединил каналы</div>
                {selected.messages.map((message) => (
                  <div key={message.id} className={`${styles.messageRow} ${message.sender === "manager" ? styles.managerRow : ""}`}>
                    <div className={`${styles.bubble} ${message.sender === "manager" ? styles.managerBubble : styles.clientBubble}`}>
                      <p>{message.text}</p>
                      <span>{message.time} {message.sender === "manager" && (message.status === "read" ? <CheckCheck /> : <Check />)}</span>
                    </div>
                  </div>
                ))}
                {analyzing && <div className={styles.aiThinking}><Sparkles /><span>AI читает контекст сделки</span><i /><i /><i /></div>}
              </div>
              <div className={styles.composerWrap}>
                {suggestion && selected.id === "aigul" && (
                  <div className={styles.inlineSuggestion}>
                    <div className={styles.inlineSuggestionHead}><WandSparkles /><strong>AI-Суфлёр подготовил ответ</strong><span>94% уверенность</span><button onClick={() => setSuggestion(false)} aria-label="Скрыть"><X /></button></div>
                    <p>Да, монтаж уже включён в предварительную сумму. После точного замера производство обычно занимает 7–10 рабочих дней, монтаж — 1 день. Могу предложить бесплатный замер сегодня после 17:00 или завтра утром — какой вариант удобнее?</p>
                    <div className={styles.suggestionMeta}><ShieldCheck /> Проверено по прайсу и регламенту от 14 июля <button onClick={() => { setComposer("Да, монтаж уже включён в предварительную сумму. После точного замера производство обычно занимает 7–10 рабочих дней, монтаж — 1 день. Могу предложить бесплатный замер сегодня после 17:00 или завтра утром — какой вариант удобнее?"); flash("Черновик вставлен — проверьте и отправьте вручную"); }}>Вставить в ответ</button></div>
                  </div>
                )}
                <div className={styles.composer}>
                  <textarea aria-label="Сообщение клиенту" value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="Напишите сообщение…" />
                  <div className={styles.composerBottom}>
                    <button aria-label="Прикрепить файл"><Paperclip /></button>
                    <button aria-label="AI-помощник"><Sparkles /></button>
                    <span>Ответ отправит менеджер</span>
                    <button className={styles.sendButton} onClick={sendMessage} disabled={!composer.trim()}><Send /> Отправить</button>
                  </div>
                </div>
              </div>
            </section>

            <aside className={styles.contextPanel}>
              <div className={styles.contextTabs}><button className={styles.contextTabActive}>Сделка</button><button>Контакт</button><button>История</button></div>
              <div className={styles.contextScroll}>
                <section className={styles.dealCard}>
                  <div className={styles.dealTop}><span className={styles.dealIcon}><Target /></span><div><small>Потенциал сделки</small><strong>{selected.amount}</strong></div><button><MoreHorizontal /></button></div>
                  <div className={styles.dealProgress}><i style={{ width: selected.stage === "Договор" ? "100%" : selected.stage === "Замер" ? "76%" : "54%" }} /></div>
                  <div className={styles.dealMeta}><span>Вероятность <b>{selected.temperature === "hot" ? "72%" : "46%"}</b></span><span>Следующий шаг <b>{selected.stage === "Замер" ? "Подтвердить время" : "Назначить замер"}</b></span></div>
                </section>

                {selected.id === "nurlan" && alertOpen && (
                  <section className={styles.reviewerAlert}>
                    <div className={styles.alertTitle}><AlertTriangle /><strong>AI-Ревизор: риск потери</strong><span>34 мин</span></div>
                    <p>Клиент завершил диалог фразой «я подумаю». В ответе нет уточняющего вопроса и следующего шага.</p>
                    <div><button onClick={() => { setComposer("Нурлан, понимаю. Чтобы вам было проще сравнить варианты, могу подготовить два расчёта — базовый и более тёплый. Что для вас важнее: уложиться в бюджет или максимальная теплоизоляция?"); }}>Исправить с AI</button><button onClick={() => setAlertOpen(false)}>Принято</button></div>
                  </section>
                )}

                <section className={styles.aiSummary}>
                  <div className={styles.sectionTitle}><span><Sparkles /> AI-резюме</span><small>обновлено сейчас</small></div>
                  <p>{selected.name.split(" ")[0]} выбирает {selected.product.toLowerCase()}. Важны теплоизоляция, итоговая цена с монтажом и быстрый срок установки.</p>
                  <div className={styles.intentRow}><span>Намерение</span><b><i /> Высокое</b></div>
                  <div className={styles.intentRow}><span>Тон клиента</span><b>Позитивный</b></div>
                </section>

                <section className={styles.detailsSection}>
                  <div className={styles.sectionTitle}><span><ClipboardCheck /> Извлечено из диалога</span><button><Plus /></button></div>
                  <dl>
                    <div><dt>Товар</dt><dd>{selected.product}</dd></div>
                    <div><dt>Локация</dt><dd>{selected.id === "aigul" ? "Каскелен" : "Алматы"}</dd></div>
                    <div><dt>Комплектация</dt><dd>Профиль 70 мм</dd></div>
                    <div><dt>Монтаж</dt><dd><Check /> Включён</dd></div>
                    <div><dt>Источник</dt><dd>{selected.source}</dd></div>
                  </dl>
                </section>

                <section className={styles.detailsSection}>
                  <div className={styles.sectionTitle}><span><UserRound /> Ответственный</span></div>
                  <div className={styles.managerLine}><div className={styles.avatarManager}>{selected.manager.slice(0, 1)}</div><div><strong>{selected.manager}</strong><small>Менеджер продаж</small></div><ChevronDown /></div>
                </section>

                <section className={styles.tagsSection}>
                  <div className={styles.sectionTitle}><span><Tag /> Метки</span></div>
                  <div><span>🏠 Частный дом</span><span>🔥 Горячий лид</span><button><Plus /></button></div>
                </section>
              </div>
            </aside>
          </main>
        ) : (
          <Dashboard onOpenInbox={() => setView("inbox")} />
        )}
      </div>
      {toast && <div className={styles.toast} role="status" aria-live="polite"><Check />{toast}</div>}
    </div>
  );
}

function Dashboard({ onOpenInbox }: { onOpenInbox: () => void }) {
  const funnel = [
    { label: "Входящие", value: 148, width: "100%", color: "#DCE8E5" },
    { label: "Квалификация", value: 96, width: "82%", color: "#B8D8D0" },
    { label: "КП отправлено", value: 61, width: "65%", color: "#75BAAA" },
    { label: "Замер", value: 38, width: "48%", color: "#318C7D" },
    { label: "Договор", value: 24, width: "34%", color: "#12665B" },
  ];
  return (
    <main className={styles.dashboard}>
      <div className={styles.dashboardTitle}>
        <div><span className={styles.eyebrow}>LIVE BUSINESS PULSE</span><h1>Продажи сегодня</h1><p>Что происходит в отделе прямо сейчас — без ручных отчётов</p></div>
        <div className={styles.periodControl}><button className={styles.periodActive}>Сегодня</button><button>Неделя</button><button>Месяц</button></div>
      </div>
      <section className={styles.metricsGrid}>
        <article><span className={styles.metricIcon}><MessageCircle /></span><div><small>Новые обращения</small><strong>32</strong><span className={styles.metricUp}>↑ 18% к вчера</span></div></article>
        <article><span className={styles.metricIcon}><Clock3 /></span><div><small>Среднее время ответа</small><strong>4:12</strong><span className={styles.metricUp}>↓ 1:08 быстрее</span></div></article>
        <article><span className={styles.metricIcon}><Target /></span><div><small>Конверсия в замер</small><strong>25,7%</strong><span className={styles.metricUp}>↑ 3,4 п.п.</span></div></article>
        <article><span className={`${styles.metricIcon} ${styles.metricWarn}`}><AlertTriangle /></span><div><small>Требуют внимания</small><strong>5</strong><button onClick={onOpenInbox}>Разобрать →</button></div></article>
      </section>
      <div className={styles.dashboardGrid}>
        <section className={`${styles.dashCard} ${styles.funnelCard}`}>
          <div className={styles.dashCardHead}><div><h2>Воронка продаж</h2><p>Последние 30 дней · 148 обращений</p></div><button><MoreHorizontal /></button></div>
          <div className={styles.funnel}>
            {funnel.map((item, index) => <div className={styles.funnelRow} key={item.label}><div className={styles.funnelLabel}><span>{item.label}</span><strong>{item.value}</strong></div><div className={styles.funnelTrack}><i style={{ width: item.width, background: item.color }} /><span>{index === 0 ? "100%" : `${Math.round((item.value / 148) * 100)}%`}</span></div></div>)}
          </div>
          <div className={styles.funnelFooter}><span><b>16,2%</b> общая конверсия</span><span><b>7,3 дня</b> средний цикл</span><span><b>18,4 млн ₸</b> в работе</span></div>
        </section>
        <section className={`${styles.dashCard} ${styles.alertFeed}`}>
          <div className={styles.dashCardHead}><div><h2>AI-Ревизор</h2><p>Сигналы, где нужна помощь</p></div><span className={styles.livePill}><i /> LIVE</span></div>
          <div className={styles.alertItem}><span className={styles.alertCritical}><Clock3 /></span><div><strong>Ответа нет 34 минуты</strong><p>Нурлан Абдрахманов · Алина</p><small>Риск потери горячего лида</small></div><time>сейчас</time></div>
          <div className={styles.alertItem}><span className={styles.alertMedium}><MessageCircle /></span><div><strong>Односложный ответ</strong><p>Диалог #1842 · Данияр</p><small>AI предлагает раскрыть потребность</small></div><time>8 мин</time></div>
          <div className={styles.alertItem}><span className={styles.alertSafe}><ShieldCheck /></span><div><strong>Проверка оплаты пройдена</strong><p>24 диалога за сегодня</p><small>Попыток обхода не найдено</small></div><time>12 мин</time></div>
          <button className={styles.allAlerts} onClick={onOpenInbox}>Открыть все сигналы <span>5</span></button>
        </section>
        <section className={`${styles.dashCard} ${styles.teamCard}`}>
          <div className={styles.dashCardHead}><div><h2>Команда</h2><p>Качество работы сегодня</p></div><button>Все менеджеры <ChevronDown /></button></div>
          <div className={styles.teamTableHead}><span>Менеджер</span><span>Диалоги</span><span>Ответ</span><span>AI-оценка</span></div>
          <div className={styles.teamRow}><div><span className={styles.teamAvatar}>Д</span><strong>Данияр М.</strong><i /></div><span>18</span><span>3:46</span><b>94</b></div>
          <div className={styles.teamRow}><div><span className={`${styles.teamAvatar} ${styles.teamAvatarTwo}`}>А</span><strong>Алина К.</strong><i /></div><span>14</span><span>5:02</span><b>89</b></div>
          <div className={styles.teamRow}><div><span className={`${styles.teamAvatar} ${styles.teamAvatarThree}`}>М</span><strong>Марат С.</strong><i /></div><span>11</span><span>6:18</span><b className={styles.scoreWarn}>76</b></div>
        </section>
        <section className={`${styles.dashCard} ${styles.activityCard}`}>
          <div className={styles.dashCardHead}><div><h2>Живая лента</h2><p>События из WhatsApp и CRM</p></div><Activity /></div>
          <div className={styles.activityItem}><span><FileText /></span><div><strong>КП отправлено Айгуль</strong><p>1 240 000 ₸ · Данияр</p></div><time>1 мин</time></div>
          <div className={styles.activityItem}><span><Target /></span><div><strong>Назначен замер</strong><p>Эльмира К. · суббота 14:00</p></div><time>6 мин</time></div>
          <div className={styles.activityItem}><span><Bot /></span><div><strong>AI создал резюме сделки</strong><p>Извлечено 5 параметров</p></div><time>9 мин</time></div>
          <div className={styles.pulseLine}><i /><i /><i /><i /><i /><i /><i /></div>
        </section>
      </div>
    </main>
  );
}
