/** Public portfolio only. Never add client information without publication approval. */
export const showcaseProjects = [
  {
    title: "Business Pulse",
    category: "AI / CRM / Бизнес-процессы",
    status: "Собственный продукт",
    description: "Клиенты, история общения и следующие шаги в одном рабочем пространстве. Основа для внедрения под процессы компании.",
    href: "/business-pulse?demo=1",
    action: "Открыть демо",
    image: "/business-pulse-showcase.png",
    alt: "Демонстрационный интерфейс Business Pulse без реальных клиентских данных",
  },
  {
    title: "От кода к физическому действию",
    category: "Робототехника / Computer vision",
    status: "Направление разработки",
    description: "Исследуем задачи на стыке ИИ, датчиков и роботизированных устройств. Начинаем с проверки осуществимости и прототипа.",
    href: "#request",
    action: "Обсудить прототип",
    image: "/vibeforge-robotics-concept.png",
    alt: "Концептуальная AI-иллюстрация роботизированного захвата, не фотография готового проекта",
  },
] as const;
