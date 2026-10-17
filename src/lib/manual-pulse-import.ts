export type ManualImportProduct = "construction" | "education" | "other";

export type ManualClientImportRecord = {
  name: string;
  phone: string;
  product: ManualImportProduct;
  source: string;
  manager: string;
  stage: number;
  value: number;
  note: string;
  waitingForBusiness: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const products = new Set<ManualImportProduct>(["construction", "education", "other"]);

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalDate(value: unknown) {
  const candidate = text(value);
  return candidate && !Number.isNaN(Date.parse(candidate)) ? candidate : undefined;
}

export function parseManualClientImport(raw: string): ManualClientImportRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Не удалось прочитать JSON");
  }
  if (!Array.isArray(parsed)) throw new Error("Ожидается массив клиентов");

  const records = parsed.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`Строка ${index + 1}: неверный формат`);
    const source = item as Record<string, unknown>;
    const name = text(source.name);
    if (!name) throw new Error(`Строка ${index + 1}: не указано имя или компания`);

    const product = products.has(source.product as ManualImportProduct)
      ? source.product as ManualImportProduct
      : "other";
    const stage = Math.min(6, Math.max(0, Math.round(Number(source.stage) || 0)));
    const value = Math.max(0, Number(source.value) || 0);

    return {
      name,
      phone: text(source.phone),
      product,
      source: text(source.source) || "Ручной ввод",
      manager: text(source.manager),
      stage,
      value,
      note: text(source.note),
      waitingForBusiness: source.waitingForBusiness === true,
      createdAt: optionalDate(source.createdAt),
      updatedAt: optionalDate(source.updatedAt),
    };
  });

  if (records.length === 0) throw new Error("В файле нет клиентов");
  return records;
}
