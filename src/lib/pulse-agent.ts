import type { BusinessPulseClient } from "./business-pulse-data";
import { businessPulseSectorMeta, businessPulseStages } from "./business-pulse-data";

export type PulseAgentConfig = {
  apiKey?: string;
  model?: string;
  apiUrl?: string;
};

export type PulseAgentBrief = {
  summary: string;
  keyPains: string[];
  callGoal: string;
  talkingPoints: string[];
  script: string;
  suggestedQuestions: string[];
  objectionTips: string[];
  source: "openai" | "heuristic";
  modelUsed?: string;
};

export type PulseAgentNextAction = {
  action: string;
  dueAtIso: string;
  dueLabel: string;
  channel: "phone" | "whatsapp" | "email";
  messageDraft: string;
  reason: string;
  source: "openai" | "heuristic";
};

export type PulseAgentFacts = {
  budget: string | null;
  decisionMaker: string | null;
  timeline: string | null;
  competitors: string[];
  objections: string[];
  keyFacts: string[];
  source: "openai" | "heuristic";
};

function getSectorTitle(productId?: string): string {
  const validId =
    productId === "construction" || productId === "education" || productId === "other"
      ? productId
      : "other";
  const meta = businessPulseSectorMeta(validId);
  return meta?.label || "Общий B2B";
}

function getStageName(stage: number): string {
  return businessPulseStages[stage]?.label || `Этап ${stage}`;
}

function computeDefaultDueDate(daysAhead: number, hour = 11): string {
  const target = new Date(Date.now() + daysAhead * 86400000);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qyzylorda', year: 'numeric', month: '2-digit', day: '2-digit' }).format(target);
  return new Date(`${day}T${String(hour).padStart(2, '0')}:00:00+05:00`).toISOString();
}

function formatDueLabel(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleString("ru-RU", {
      timeZone: 'Asia/Qyzylorda',
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoDate;
  }
}

const semanticRules = `Различай план, обещание и выполненный факт. «Отправить», «надо отправить», «ещё не отправил» — НЕ отправлено: сначала напомни менеджеру выполнить отправку. «Отправил/отправлена» — сообщение менеджера о выполнении, а не доказательство доставки. Этап воронки сам по себе не доказывает отправку, получение, оплату или готовность договора. Не выдумывай выполненные действия. Уточнение менеджера исправляет трактовку этой карточки; при неясности предложи уточнить статус.`;

export function materialSendingState(client: BusinessPulseClient): 'pending' | 'sent' | 'unknown' {
  const classify = (raw: string): 'pending' | 'sent' | null => {
    const text = raw.toLowerCase().replace(/оптрав|отпарв|отпрпав|отрав/g, 'отправ').replace(/отправиьт/g, 'отправить');
    if (!/през|материал|(?:^|\s)кп(?:\s|$)|расч[её]т|видео|информац/u.test(text)) return null;
    const negative = /не\s+(?:(?:еще|ещё|был[аио]?)\s+)*(?:отправ|высл|посла|скин)/u.test(text);
    const planned = /(?:отправить|отправлю|выслать|вышлю|скинуть|скину|направить|направлю)/u.test(text);
    if (negative || planned) return 'pending';
    if (/(?:отправил[аи]?|отправлен[аоы]?|выслал[аи]?|выслан[аоы]?|скинул[аи]?|направил[аи]?|направлен[аоы]?)(?:\s|[.,;!]|$)/u.test(text)) return 'sent';
    return null;
  };
  const latest = [...client.history].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order).at(-1);
  // A current correction has priority. An explicit recent result supersedes an older plan.
  for (const text of [client.agentComment, client.note, latest?.result, client.nextAction, latest?.nextAction]) {
    const state = text ? classify(text) : null;
    if (state) return state;
  }
  return 'unknown';
}

// Fallback heuristic generator (deterministic, fast, zero network required)
export function fallbackClientBrief(client: BusinessPulseClient): PulseAgentBrief {
  const sector = getSectorTitle(client.product);
  const stageName = getStageName(client.stage);
  const contact = client.contact?.trim() || "Контактное лицо";
  const company = client.name?.trim() || "Компания";

  const pains: string[] = [];
  if (client.history.some((h) => h.pain)) {
    client.history.forEach((h) => {
      if (h.pain && !pains.includes(h.pain)) pains.push(h.pain);
    });
  }
  if (pains.length === 0) {
    if (client.product === "construction") {
      pains.push("Срыв сроков поставок подрядчиками", "Необходимость точной спецификации и сертификации");
    } else if (client.product === "education") {
      pains.push("Сложное согласование бюджета и соблюдение нормативов безопасности");
    } else {
      pains.push("Оптимизация расходов и контроль соблюдения сроков выполнения работ");
    }
  }

  let callGoal = "Уточнить текущую потребность и закрепить следующий конкретный шаг";
  let script = `Здравствуйте, ${contact}! Звоню по поводу сотрудничества с ${company}. Хотел уточнить, как сейчас обстоят дела с проектом и когда удобно обсудить детали?`;
  const talkingPoints: string[] = [
    `Напомнить контекст: отрасль ${sector}, текущий статус — ${stageName}`,
    "Проверить статус рассмотрения ранее обсуждавшихся вопросов",
  ];
  const suggestedQuestions: string[] = [
    "Какой дедлайн для вас сейчас в приоритете по этому проекту?",
    "Кто помимо вас участвует в согласовании условий?",
  ];
  const objectionTips: string[] = [
    "Если говорят 'дорого': разложить стоимость на этапы и предложить оптимизацию спецификации без потери качества.",
    "Если говорят 'подумаем': предложить зафиксировать конкретную дату и выслать один ключевой расчёт в WhatsApp.",
  ];

  if (client.stage === 0) {
    callGoal = "Познакомиться с ЛПР, выявить объем потребности и квалифицировать интерес";
    script = `Здравствуйте, ${contact}! Меня зовут менеджер Business Pulse. Мы работаем с компаниями из сферы «${sector}». Подскажите, рассматриваете ли вы сейчас подрядчиков по остеклению/проектам?`;
    talkingPoints.push("Выяснить, кто принимает итоговое решение и утверждает бюджет");
  } else if (client.stage === 1) {
    callGoal = "Запросить техническое задание, проект или согласовать выезд замерщика";
    script = `Добрый день, ${contact}! Возвращаюсь к нашему первому разговору. Готовы ли вы передать размеры или проект для предварительного расчета сметы?`;
  } else if (client.stage === 2) {
    callGoal = "Провести презентацию решения и зафиксировать встречу для согласования сметы";
    script = `Здравствуйте, ${contact}! Подготовили предварительное предложение с учетом специфики ${sector}. Удобно ли созвониться на 15 минут или встретиться, чтобы пройтись по ключевым позициям?`;
    talkingPoints.push("Показать выгоду по срокам и гарантии");
  } else if (client.stage === 3) {
    callGoal = "Обсудить отправленное КП, снять ценовые вопросы и перейти к фиксации условий";
    script = `Здравствуйте, ${contact}! Направленное коммерческое предложение уже удалось посмотреть? Какие пункты вызывают вопросы или требуют корректировки?`;
  } else if (client.stage >= 4) {
    callGoal = "Согласовать финальный договор, график оплат и дату начала работ";
    script = `Здравствуйте, ${contact}! По проекту ${company} все технические детали согласованы. Давайте закрепим сроки подписания договора и выхода на объект.`;
  }

  if (materialSendingState(client) === 'pending') {
    callGoal = 'Сначала отправить обещанные материалы клиенту';
    script = `Здравствуйте, ${contact}! Готовлю обещанные материалы. Подскажите, удобно получить их в этом канале?`;
    talkingPoints.unshift('Отправка пока не выполнена: не переходить к контрольному звонку после отправки.');
  }
  const latestHistory = client.history.at(-1);
  const summary = `${company} (${sector}). Контакт: ${contact}. Текущий этап: ${stageName}. Касаний в истории: ${client.history.length}. ${
    latestHistory ? `Последний итог: ${latestHistory.result || latestHistory.nextAction || "Касание зафиксировано"}.` : client.note || "Первичное взаимодействие."
  }`;

  return {
    summary: summary + (client.agentComment ? ` Уточнение менеджера: ${client.agentComment}` : ''),
    keyPains: pains,
    callGoal,
    talkingPoints,
    script,
    suggestedQuestions,
    objectionTips,
    source: "heuristic",
  };
}

export function fallbackNextAction(client: BusinessPulseClient): PulseAgentNextAction {
  const sending = materialSendingState(client);
  if (sending === 'pending' || (client.stage === 2 && sending === 'unknown')) {
    const dueAtIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    return {
      action: sending === 'pending' ? 'Отправить обещанную презентацию / материалы клиенту' : 'Уточнить, отправлены ли материалы; если нет — отправить',
      dueAtIso, dueLabel: formatDueLabel(dueAtIso),
      channel: /почт|email/i.test([client.note, client.agentComment, client.nextAction, client.history.at(-1)?.channel].join(' ')) ? 'email' : 'whatsapp',
      messageDraft: 'Здравствуйте! Подготовлю обещанные материалы. Подскажите, удобно получить их здесь?',
      reason: sending === 'pending' ? 'В записи указано поручение на отправку, а не выполненная отправка. Сначала выполните обещание и зафиксируйте результат; затем планируйте повторный контакт.' : 'Этап «Презентация» не подтверждает отправку. Сначала проверьте факт отправки, чтобы не пропустить обещание.',
      source: 'heuristic',
    };
  }
  const contact = client.contact?.split(/[\s-]/)[0] || "партнер";
  let action = "Связаться с клиентом для уточнения статуса";
  let days = 2;
  let channel: "phone" | "whatsapp" | "email" = "phone";
  let messageDraft = `Здравствуйте, ${contact}! Направляю информацию по нашей договоренности. Подскажите, получилось ли ознакомиться?`;
  let reason = "Стандартный интервал касания для поддержания динамики сделки.";

  if (client.stage === 0) {
    action = "Первичный созвон: квалификация потребности и ЛПР";
    days = 1;
    channel = "phone";
    messageDraft = `Здравствуйте! Звонили из компании по остеклению для ${client.name}. Будем рады обсудить текущие задачи — когда вам удобно созвониться на пару минут?`;
    reason = "Новый контакт требует быстрого отклика в течение 24 часов.";
  } else if (client.stage === 1) {
    action = "Запросить проектную документацию или согласовать замер в WhatsApp";
    days = 2;
    channel = "whatsapp";
    messageDraft = `Здравствуйте, ${contact}! Готовы сделать точный предварительный расчет для ${client.name}. Сможете направить размеры или спецификацию в этот чат?`;
    reason = "Перевод в мессенджер ускоряет передачу файлов и чертежей.";
  } else if (client.stage === 2) {
    action = "Контрольный звонок после отправки презентации/расчётов";
    days = 2;
    channel = "phone";
    messageDraft = `Здравствуйте, ${contact}! Подскажите, получили ли вы отправленные материалы и удалось ли ознакомиться?`;
    reason = "Важно проверить реакцию клиента, пока предложение актуально.";
  } else if (client.stage === 3) {
    action = "Согласование КП и отработка вопросов по смете";
    days = 3;
    channel = "phone";
    messageDraft = `Здравствуйте, ${contact}! По смете для ${client.name}: готовы предоставить спецификацию с разделением на этапы. Когда удобно обсудить детали?`;
    reason = "Стадия КП требует проактивного снятия сомнений по цене и срокам.";
  } else if (client.stage >= 4) {
    action = "Финальное согласование договора и даты запуска";
    days = 1;
    channel = "phone";
    messageDraft = `Здравствуйте, ${contact}! Подскажите, какие вопросы осталось согласовать и когда удобно обсудить следующий шаг?`;
    reason = "Финальные стадии требуют максимальной скорости закрытия.";
  }

  const dueAtIso = computeDefaultDueDate(days);
  return {
    action,
    dueAtIso,
    dueLabel: formatDueLabel(dueAtIso),
    channel,
    messageDraft,
    reason,
    source: "heuristic",
  };
}

export function fallbackExtractFacts(client: BusinessPulseClient): PulseAgentFacts {
  const textCorpus = [
    client.agentComment || '',
    client.note || "",
    ...client.history.map((h) => [h.result, h.achieved, h.difficulty, h.pain, ...h.details].filter(Boolean).join(" ")),
  ].join("\n");

  const budgetMatch = textCorpus.match(/(?:бюджет|цена|стоимость|₸|тг|тенге|руб|сумму)\s*[:=~-]?\s*([0-9\s.,]+(?:млн|тыс|₸|тг|тенге)?)/i);
  const budget = budgetMatch ? budgetMatch[0].trim() : client.value ? `${client.value.toLocaleString("ru-RU")} ₸` : null;

  const decisionMaker = client.contact ? client.contact : null;

  const timelineMatch = textCorpus.match(/(?:срок|дедлайн|до\s+\d+|к\s+[а-я]+|в\s+течение\s+\d+\s*(?:дней|недель|месяцев))/i);
  const timeline = timelineMatch ? timelineMatch[0].trim() : null;

  const competitors: string[] = [];
  if (/конкурент|другая компания|другие|тендер/i.test(textCorpus)) {
    competitors.push("Рассматривают альтернативные коммерческие предложения / тендер");
  }

  const objections: string[] = [];
  if (/дорог|скидк|дешевл|бюджет не проходит/i.test(textCorpus)) {
    objections.push("Возражение по стоимости (запрос скидки / сравнение цен)");
  }
  if (/подума|позже|не к спеху|в следующ/i.test(textCorpus)) {
    objections.push("Откладывание решения ('надо подумать')");
  }
  if (/нет времени|занят|перезвоните потом/i.test(textCorpus)) {
    objections.push("Сложность с выходом на контакт (высокая занятость)");
  }

  const keyFacts: string[] = [
    `Отрасль: ${getSectorTitle(client.product)}`,
    `Источник лида: ${client.source || "Не указан"}`,
    `Количество взаимодействий: ${client.history.length}`,
  ];
  if (client.waitingForBusiness) {
    keyFacts.push("Статус: ожидает инициативы от компании");
  }

  return {
    budget,
    decisionMaker,
    timeline,
    competitors,
    objections,
    keyFacts,
    source: "heuristic",
  };
}

export async function generateClientBrief(
  client: BusinessPulseClient,
  config?: PulseAgentConfig
): Promise<PulseAgentBrief> {
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
  const model = config?.model || process.env.OPENAI_MODEL || "gpt-5-mini";

  if (!apiKey) {
    return fallbackClientBrief(client);
  }

  const prompt = `Ты — профессиональный AI-ассистент Бизнес Пульс (Business Pulse AI) для продаж и работы с клиентами в любом бизнесе.
Твоя задача — составить точный, ёмкий предзвонковый бриф для менеджера перед звонком или сообщением клиенту.

Данные клиента:
- Уточнение менеджера: ${client.agentComment || 'Нет'}
- Компания: ${client.name}
- Контактное лицо: ${client.contact || "Не указано"}
- Телефон/Канал: ${client.phone || "Не указано"}
- Отрасль: ${getSectorTitle(client.product)}
- Этап воронки: ${getStageName(client.stage)}
- Сумма сделки: ${client.value ? client.value + " ₸" : "Не указана"}
- Заметка: ${client.note || "Отсутствует"}
- История предыдущих касаний (${client.history.length}):
${client.history.map((h, idx) => `  ${idx + 1}. [${h.date}] Канал: ${h.channel || "звонок"}, Результат: ${h.result || ""}, Боль: ${h.pain || ""}, Следующий шаг: ${h.nextAction || ""}`).join("\n") || "  Касаний ещё не было."}

Ответь строго в JSON формате:
{
  "summary": "Краткое досье в 2 предложениях: кто клиент, статус и в чем суть",
  "keyPains": ["боль 1", "боль 2"],
  "callGoal": "Конкретная цель предстоящего звонка",
  "talkingPoints": ["тезис 1", "тезис 2", "тезис 3"],
  "script": "Естественный речевой скрипт для приветствия и перехода к сути",
  "suggestedQuestions": ["вопрос 1", "вопрос 2"],
  "objectionTips": ["совет по отработке возражения"]
}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: semanticRules }, { role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return fallbackClientBrief(client);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) return fallbackClientBrief(client);

    const parsed = JSON.parse(rawContent);
    return {
      summary: parsed.summary || fallbackClientBrief(client).summary,
      keyPains: Array.isArray(parsed.keyPains) ? parsed.keyPains : [],
      callGoal: parsed.callGoal || "Связаться с клиентом",
      talkingPoints: Array.isArray(parsed.talkingPoints) ? parsed.talkingPoints : [],
      script: parsed.script || fallbackClientBrief(client).script,
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions : [],
      objectionTips: Array.isArray(parsed.objectionTips) ? parsed.objectionTips : [],
      source: "openai",
      modelUsed: model,
    };
  } catch {
    return fallbackClientBrief(client);
  }
}

export async function suggestNextAction(
  client: BusinessPulseClient,
  config?: PulseAgentConfig
): Promise<PulseAgentNextAction> {
  const sending = materialSendingState(client);
  if (sending === 'pending' || (client.stage === 2 && sending === 'unknown')) return fallbackNextAction(client);
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
  const model = config?.model || process.env.OPENAI_MODEL || "gpt-5-mini";

  if (!apiKey) {
    return fallbackNextAction(client);
  }

  const prompt = `Ты — AI-ассистент Бизнес Пульс (Business Pulse AI). Проанализируй карточку клиента и порекомендуй один точечный следующий шаг с дедлайном и готовым текстом сообщения.

Компания: ${client.name}
Уточнение менеджера: ${client.agentComment || 'Нет'}
Контакт: ${client.contact || "Не указан"}
Отрасль: ${getSectorTitle(client.product)}
Этап воронки: ${getStageName(client.stage)}
Заметка: ${client.note || ""}
Последнее касание: ${JSON.stringify(client.history.at(-1) || {})}

Верни строго JSON:
{
  "action": "Четкая формулировка действия для менеджера (до 15 слов)",
  "daysOffset": 1, 2 или 3 (через сколько дней лучше связаться),
  "channel": "phone" или "whatsapp" или "email",
  "messageDraft": "Готовый короткий текст для мессенджера/письма клиенту",
  "reason": "Почему именно это действие сейчас критично"
}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: semanticRules }, { role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return fallbackNextAction(client);

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) return fallbackNextAction(client);

    const parsed = JSON.parse(rawContent);
    const days = typeof parsed.daysOffset === "number" ? parsed.daysOffset : 2;
    const dueAtIso = computeDefaultDueDate(days);

    return {
      action: parsed.action || fallbackNextAction(client).action,
      dueAtIso,
      dueLabel: formatDueLabel(dueAtIso),
      channel: parsed.channel === "whatsapp" || parsed.channel === "email" ? parsed.channel : "phone",
      messageDraft: parsed.messageDraft || fallbackNextAction(client).messageDraft,
      reason: parsed.reason || "Поддержание регулярного контакта с клиентом.",
      source: "openai",
    };
  } catch {
    return fallbackNextAction(client);
  }
}

export async function extractFacts(
  client: BusinessPulseClient,
  config?: PulseAgentConfig
): Promise<PulseAgentFacts> {
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
  const model = config?.model || process.env.OPENAI_MODEL || "gpt-5-mini";

  if (!apiKey) {
    return fallbackExtractFacts(client);
  }

  const prompt = `Ты — AI-агент извлечения фактов Бизнес Пульс (Business Pulse Fact Extractor).
Проанализируй всю доступную информацию о клиенте и выдели структурированные факты:
Компания: ${client.name}
Контакт: ${client.contact || ""}
Сумма: ${client.value || ""}
Заметки: ${client.note || ""}
Уточнение менеджера: ${client.agentComment || 'Нет'}
История касаний: ${JSON.stringify(client.history)}

Ответь строго в JSON:
{
  "budget": "найденный бюджет или null",
  "decisionMaker": "найденное имя/роль ЛПР или null",
  "timeline": "найденные сроки или null",
  "competitors": ["конкурент или альтернатива"],
  "objections": ["выявленные возражения"],
  "keyFacts": ["важный установленный факт"]
}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: semanticRules }, { role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return fallbackExtractFacts(client);

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) return fallbackExtractFacts(client);

    const parsed = JSON.parse(rawContent);
    return {
      budget: parsed.budget || fallbackExtractFacts(client).budget,
      decisionMaker: parsed.decisionMaker || fallbackExtractFacts(client).decisionMaker,
      timeline: parsed.timeline || fallbackExtractFacts(client).timeline,
      competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
      objections: Array.isArray(parsed.objections) ? parsed.objections : [],
      keyFacts: Array.isArray(parsed.keyFacts) ? parsed.keyFacts : [],
      source: "openai",
    };
  } catch {
    return fallbackExtractFacts(client);
  }
}
