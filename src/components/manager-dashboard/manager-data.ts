export type ZoneId = "red" | "yellow" | "green";
export type TaskKind = "call" | "message" | "quote" | "followup";

export type ManagerTask = {
  id: string;
  client: string;
  product: string;
  stage: string;
  action: string;
  kind: TaskKind;
  priority: "Сейчас" | "Высокий" | "План";
  wait: string;
  value: number;
  temperature: "Горячий" | "Тёплый" | "Холодный";
  context: string;
  insight: string;
  script: string;
};

export const paymentTiers = [
  { id: "red" as const, label: "Красная зона", min: 0, max: 4_999_999, base: 180_000, rate: 0.01, target: 3_000_000 },
  { id: "yellow" as const, label: "Жёлтая зона", min: 5_000_000, max: 6_999_999, base: 220_000, rate: 0.02, target: 5_000_000 },
  { id: "green" as const, label: "Зелёная зона", min: 7_000_000, max: Number.POSITIVE_INFINITY, base: 260_000, rate: 0.03, target: 7_000_000 },
];

export function getPaymentTier(sales: number) {
  return paymentTiers.find((tier) => sales >= tier.min && sales <= tier.max) ?? paymentTiers[0];
}

export function calculateIncome(sales: number) {
  const tier = getPaymentTier(sales);
  const commission = Math.round(sales * tier.rate);
  return { tier, commission, total: tier.base + commission };
}

export const managerProfile = {
  name: "Данияр К.",
  branch: "Точка Абая",
  level: 14,
  xp: 72,
  currentSales: 5_800_000,
  plan: 7_000_000,
  calls: 42,
  conversations: 26,
  deals: 9,
  conversion: 21.4,
  lifetimeRevenue: 48_600_000,
  companyContribution: 18,
  workDays: 412,
};

export const managerTasks: ManagerTask[] = [
  {
    id: "task-1", client: "Айгуль С.", product: "Окна", stage: "Диалог", action: "Позвонить и согласовать замер", kind: "call", priority: "Сейчас", wait: "ждёт 18 мин", value: 780_000, temperature: "Горячий",
    context: "Квартира на солнечной стороне, главная боль — жара летом и шум с улицы.",
    insight: "Клиент уже спросил про ближайшую дату замера. Не возвращайтесь к общему описанию продукта — зафиксируйте время.",
    script: "Айгуль, я подобрал два решения под вашу задачу. Чтобы назвать точную сумму, предлагаю замер завтра в 18:30 или в субботу утром. Как удобнее?",
  },
  {
    id: "task-2", client: "Тимур Ж.", product: "Двери", stage: "КП", action: "Ответить на вопрос о сроках", kind: "message", priority: "Высокий", wait: "ждёт 31 мин", value: 640_000, temperature: "Горячий",
    context: "Сравнивает с конкурентом. Цена устраивает, сомнение только в сроке установки.",
    insight: "Срок — единственный открытый риск. Дайте конкретную дату и сразу предложите резерв производства.",
    script: "Тимур, подтверждаю: изготовление займёт 12 рабочих дней, монтаж — один день. Могу закрепить производственное окно до 17:00 без оплаты. Зафиксировать за вами?",
  },
  {
    id: "task-3", client: "Руслан М.", product: "Балкон", stage: "КП", action: "Напомнить о предложении", kind: "followup", priority: "Высокий", wait: "без ответа 2 дня", value: 1_240_000, temperature: "Тёплый",
    context: "КП открыто дважды. Клиент обсуждает бюджет с супругой.",
    insight: "Не спрашивайте «посмотрели ли КП». Снизьте сложность решения: предложите два бюджета.",
    script: "Руслан, подготовил короткое сравнение: базовый вариант и тёплое решение с отделкой. Разница 180 000 ₸. Отправить одним сообщением, чтобы было удобно обсудить дома?",
  },
  {
    id: "task-4", client: "Жанна Т.", product: "Окна", stage: "Заявка", action: "Первый звонок по новой заявке", kind: "call", priority: "План", wait: "новая заявка", value: 520_000, temperature: "Тёплый",
    context: "Пришла с рекламы «Тепло без переплат», указала двухкомнатную квартиру.",
    insight: "Сначала выясните комнату с главной проблемой и срок, затем говорите о решении.",
    script: "Жанна, добрый день. Вы оставили заявку по тёплым окнам. Подскажите, где проблема сильнее — дует, шумно или запотевает?",
  },
  {
    id: "task-5", client: "Марат Н.", product: "Двери", stage: "Договор", action: "Получить реквизиты для договора", kind: "message", priority: "План", wait: "обещал сегодня", value: 860_000, temperature: "Горячий",
    context: "Условия согласованы. Для договора не хватает ИИН и адреса монтажа.",
    insight: "Сделка готова к оформлению. Запросите только два недостающих поля одним сообщением.",
    script: "Марат, всё согласовано. Для договора осталось прислать ИИН и точный адрес монтажа. После этого сразу отправлю документ на проверку.",
  },
  {
    id: "task-6", client: "Сауле Р.", product: "Балкон", stage: "Старая база", action: "Вернуть клиента из базы", kind: "call", priority: "План", wait: "90 дней без контакта", value: 1_080_000, temperature: "Холодный",
    context: "Весной отложила проект до августа. Просила напомнить после отпуска.",
    insight: "Есть разрешение на повторный контакт. Начните с прежней договорённости, а не с новой продажи.",
    script: "Сауле, добрый день. Весной договаривались вернуться к балкону в августе. Проект ещё актуален или планы изменились?",
  },
];

export const replyTask: ManagerTask = {
  id: "reply-task", client: "Айгуль С.", product: "Окна", stage: "Диалог", action: "Ответить: клиент выбрал время", kind: "message", priority: "Сейчас", wait: "ответила только что", value: 780_000, temperature: "Горячий",
  context: "Клиент выбрал субботу утром и уточнил, платный ли замер.",
  insight: "Ответ клиента автоматически поднял задачу наверх. Подтвердите время и снимите вопрос об оплате.",
  script: "Отлично, записал вас на субботу, 10:00. Замер бесплатный, мастер заранее позвонит. Подтверждаю адрес из заявки?",
};

export const sixMonthHistory = [
  { month: "Фев", sales: 3_200_000, zone: "red" as ZoneId },
  { month: "Мар", sales: 4_800_000, zone: "red" as ZoneId },
  { month: "Апр", sales: 5_400_000, zone: "yellow" as ZoneId },
  { month: "Май", sales: 7_600_000, zone: "green" as ZoneId },
  { month: "Июн", sales: 6_300_000, zone: "yellow" as ZoneId },
  { month: "Июл", sales: 8_100_000, zone: "green" as ZoneId },
];

export const contributionPeriods = {
  day: { label: "Сегодня", revenue: 680_000, company: 3_420_000, deals: 1 },
  month: { label: "Месяц", revenue: 5_800_000, company: 31_900_000, deals: 9 },
  halfYear: { label: "6 месяцев", revenue: 35_400_000, company: 197_000_000, deals: 54 },
  lifetime: { label: "Всё время", revenue: 48_600_000, company: 268_000_000, deals: 73 },
};

export function formatMoney(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млн ₸`;
  return `${Math.round(value / 1_000).toLocaleString("ru-RU")} тыс. ₸`;
}
