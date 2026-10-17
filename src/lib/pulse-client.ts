export type LeadTemperature = "cold" | "warm" | "hot";
export type PulseProduct = "windows" | "doors" | "balconies";

export type PulseClientIdentity = {
  name: string;
  phoneMasked: string;
  manager: string;
  temperature: LeadTemperature;
  painDetected: boolean;
  needDetected: boolean;
  painSummary: string;
  needSummary: string;
};

const clientNames = [
  "Айгуль С.",
  "Бекзат Н.",
  "Динара К.",
  "Арман Т.",
  "Жанна Б.",
  "Нурлан А.",
  "Сауле Е.",
  "Марат О.",
  "Алия Н.",
  "Ержан Д.",
  "Карина Р.",
  "Тимур Ж.",
];

const managers = ["Алия С.", "Данияр К.", "Мадина Т.", "Аскар Б."];

const productContext: Record<PulseProduct, { pain: string; need: string }> = {
  windows: {
    pain: "Сквозняк и высокие теплопотери",
    need: "Новые окна с замером и монтажом",
  },
  doors: {
    pain: "Шум и слабая теплоизоляция",
    need: "Дверь под интерьер с установкой",
  },
  balconies: {
    pain: "Балкон холодный и не используется зимой",
    need: "Тёплое остекление балкона под ключ",
  },
};

const numericSeed = (id: string) => Number(id.replace(/\D/g, "")) || 1;

export function getPulseClientIdentity(
  id: string,
  product: PulseProduct,
  stage: number,
): PulseClientIdentity {
  const seed = numericSeed(id);
  const context = productContext[product];
  const painDetected = stage >= 2 || (stage === 1 && seed % 4 !== 0);
  const needDetected = stage >= 2 || (stage === 1 && seed % 3 !== 0);
  const temperature: LeadTemperature = stage >= 2
    ? (seed % 4 === 0 ? "warm" : "hot")
    : stage === 1
      ? (seed % 5 === 0 ? "cold" : seed % 2 === 0 ? "warm" : "hot")
      : (seed % 3 === 0 ? "warm" : "cold");

  return {
    name: clientNames[seed % clientNames.length],
    phoneMasked: `+7 7•• •••-${String(seed % 100).padStart(2, "0")}-${String((seed * 7) % 100).padStart(2, "0")}`,
    manager: managers[seed % managers.length],
    temperature,
    painDetected,
    needDetected,
    painSummary: painDetected ? context.pain : "Ещё не выявлена",
    needSummary: needDetected ? context.need : "Нужно уточнить в диалоге",
  };
}

export const temperatureLabel: Record<LeadTemperature, string> = {
  cold: "Холодный",
  warm: "Тёплый",
  hot: "Горячий",
};
