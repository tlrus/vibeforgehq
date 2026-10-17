import { getPulseClientIdentity, type LeadTemperature, type PulseProduct } from "@/lib/pulse-client";

export type DemoSource = "reels" | "carousel" | "stories" | "whatsapp" | "instagram" | "coldBase" | "website";
export type DemoBranch = "abai" | "mega" | "orbita" | "turan";
export type DemoOwner = "business" | "client" | "none";

export type PilotDemoClient = {
  id: string;
  name: string;
  phoneMasked: string;
  manager: string;
  source: DemoSource;
  branch: DemoBranch;
  product: PulseProduct;
  stage: number;
  waitingMinutes: number;
  enteredAt: string;
  changedAt: number;
  previousStage: number | null;
  nextActionOwner: DemoOwner;
  waitingForBusiness: boolean;
  value: number;
  enteredMinutesAgo: number;
  cycleMinutes?: number;
  temperature: LeadTemperature;
  painDetected: boolean;
  needDetected: boolean;
  painSummary: string;
  needSummary: string;
};

const productOptions: Record<DemoSource, PulseProduct[]> = {
  reels: ["windows", "doors"],
  carousel: ["windows", "balconies"],
  stories: ["doors", "balconies"],
  whatsapp: ["windows", "balconies"],
  instagram: ["doors"],
  coldBase: ["windows", "doors", "balconies"],
  website: ["windows", "doors", "balconies"],
};

const sourceCycle: DemoSource[] = [
  "reels", "carousel", "stories", "website", "whatsapp", "instagram", "coldBase",
  "reels", "website", "carousel", "whatsapp",
];

export const demoStageCodes = ["LEAD", "DIALOG", "QUOTE", "CONTRACT", "FULFILLMENT", "FULFILLMENT", "PAYMENT"] as const;
export const demoProductNames: Record<PulseProduct, string> = { windows: "Окна", doors: "Двери", balconies: "Балконы" };
export const demoBranchNames: Record<DemoBranch, string> = { abai: "Абая", mega: "Mega", orbita: "Орбита", turan: "Туран" };

export function buildPilotDemoClients(): PilotDemoClient[] {
  const currentByStage = [22, 18, 16, 8, 7, 5, 10];
  const paidValues = [420_000, 580_000, 760_000, 690_000, 840_000, 510_000, 930_000, 640_000, 720_000, 560_000];
  const branchIds: DemoBranch[] = ["abai", "mega", "orbita", "turan"];
  const entryAgeBase = [8, 35, 180, 900, 1500, 2400, 90];
  const entryAgeSpread = [620, 840, 2100, 2600, 3600, 4200, 560];
  let clientIndex = 0;
  let paidIndex = 0;

  return currentByStage.flatMap((count, stage) => Array.from({ length: count }, (_, stageIndex) => {
    const index = clientIndex++;
    const isWaitingExample = index === 7 || index === 46;
    const waitingMinutes = stage === 6 ? 0 : isWaitingExample ? 92 + (index % 2) * 38 : 4 + ((index * 17 + stage * 11) % 48);
    const nextActionOwner: DemoOwner = stage === 6 ? "none" : isWaitingExample || index % 3 !== 1 ? "business" : "client";
    const source = sourceCycle[(index + stageIndex * 2 + stage) % sourceCycle.length];
    const sourceProducts = productOptions[source];
    const id = `VF-${1843 + index}`;
    const product = sourceProducts[(index + stage * 2) % sourceProducts.length];
    const identity = getPulseClientIdentity(id, product, stage);
    return {
      id,
      ...identity,
      source,
      branch: branchIds[(index + stage) % branchIds.length],
      product,
      stage,
      waitingMinutes,
      enteredAt: `${String(9 + Math.floor(index / 9)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}`,
      changedAt: 0,
      previousStage: null,
      nextActionOwner,
      waitingForBusiness: isWaitingExample,
      value: stage === 6 ? paidValues[paidIndex++] : stage >= 2 ? 480_000 + ((index * 73_000) % 620_000) : 0,
      enteredMinutesAgo: entryAgeBase[stage] + ((index * 47 + stage * 83) % entryAgeSpread[stage]),
      cycleMinutes: stage === 6 ? 4_900 + ((index * 617) % 13_600) : undefined,
    };
  }));
}

export type DemoDialogueInsight = {
  summary: string;
  intent: string;
  objection: string;
  decisionCriteria: string;
  budget: string;
  timeline: string;
  nextStep: string;
  confidence: number;
  dimensions: string;
};

export function getDemoDialogueInsight(client: Pick<PilotDemoClient, "id" | "stage" | "product" | "value" | "painSummary" | "needSummary" | "nextActionOwner">): DemoDialogueInsight {
  const seed = Number(client.id.replace(/\D/g, "")) || 1;
  const dimensions = client.product === "windows"
    ? ["3 окна: 1450×1350 мм", "2 окна: 1300×1400 мм", "балконный блок 2100×1800 мм"][seed % 3]
    : client.product === "doors"
      ? ["проём 900×2050 мм", "проём 1000×2100 мм", "2 двери, размеры после замера"][seed % 3]
      : ["лоджия 5,8 м", "балкон 3,2×1,1 м", "П-образный балкон 6,4 м"][seed % 3];
  const budget = client.value
    ? `${Math.round(client.value / 10_000) * 10_000} ₸ подтверждено в расчёте`
    : [`до 650 000 ₸`, `ориентир 450–700 тыс. ₸`, `бюджет уточняется после замера`][seed % 3];
  const timeline = client.stage >= 4
    ? ["монтаж согласован на следующую неделю", "клиент просит закончить до конца месяца", "срок зафиксирован в заказе"][seed % 3]
    : ["хочет решение в течение 7–10 дней", "готов к замеру на этой неделе", "сравнивает варианты, срок до конца месяца"][seed % 3];
  const decisionCriteria = client.product === "windows"
    ? "теплоизоляция, монтаж под ключ и гарантия"
    : client.product === "doors"
      ? "шумоизоляция, внешний вид и срок установки"
      : "сохранение тепла, отделка и полный срок работ";
  const intentByStage = [
    "узнать порядок и предварительную стоимость",
    "подобрать решение и согласовать параметры",
    "проверить состав и условия коммерческого предложения",
    "согласовать формулировки и подписать договор",
    "получить заказ в согласованный срок",
    "подтвердить приёмку и закрыть расчёт",
    "заказ завершён и оплачен",
  ];
  const objectionByStage = [
    "пока не назвал точные размеры",
    "сомневается, уложится ли решение в бюджет",
    seed % 2 ? "просит подтвердить, что монтаж входит в стоимость" : "сравнивает срок изготовления с другим предложением",
    seed % 2 ? "просит изменить срок в договоре" : "уточняет гарантию и порядок оплаты",
    "нужен точный статус производства и дата монтажа",
    "ожидает закрывающие документы и итоговый расчёт",
    "возражений нет",
  ];
  const nextStepByStage = [
    "Ответить в течение 10 минут и предложить замер",
    "Зафиксировать размеры, адрес, бюджет и удобное время замера",
    client.nextActionOwner === "business" ? "Ответить на вопрос по КП и отправить обновлённую версию" : "Позвонить после просмотра КП и зафиксировать решение",
    client.nextActionOwner === "business" ? "Внести правку и повторно отправить договор" : "Получить подпись и передать заказ в работу",
    "Подтвердить статус заказа и следующую контрольную дату",
    "Получить подтверждение приёмки и направить ссылку на оплату",
    "Запросить отзыв и разрешение на повторный контакт",
  ];
  const confidence = Math.min(97, 48 + client.stage * 7 + (seed % 13));
  return {
    summary: `${client.needSummary}. Причина обращения: ${client.painSummary.toLocaleLowerCase("ru-RU")}.`,
    intent: intentByStage[client.stage] ?? intentByStage[0],
    objection: objectionByStage[client.stage] ?? objectionByStage[0],
    decisionCriteria,
    budget,
    timeline,
    nextStep: nextStepByStage[client.stage] ?? nextStepByStage[0],
    confidence,
    dimensions,
  };
}
