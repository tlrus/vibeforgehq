import { describe, expect, it } from "vitest";
import { parseManualClientImport } from "./manual-pulse-import";

describe("manual pulse import", () => {
  it("normalizes an imported call", () => {
    const [record] = parseManualClientImport(JSON.stringify([{
      name: "Компания",
      product: "construction",
      source: "2ГИС",
      stage: 1,
      waitingForBusiness: true,
    }]));

    expect(record).toMatchObject({
      name: "Компания",
      phone: "",
      product: "construction",
      source: "2ГИС",
      stage: 1,
      waitingForBusiness: true,
    });
  });

  it("clamps stage and money to safe values", () => {
    const [record] = parseManualClientImport(JSON.stringify([{ name: "Лид", stage: 99, value: -10 }]));
    expect(record.stage).toBe(6);
    expect(record.value).toBe(0);
  });

  it("rejects rows without a company", () => {
    expect(() => parseManualClientImport('[{"name":""}]')).toThrow("не указано имя");
  });
});
