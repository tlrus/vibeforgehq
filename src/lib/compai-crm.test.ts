import { describe, expect, it, vi } from "vitest";
import {
  splitContactName,
  formatCompAiContact,
  mapEventTypeToCompAiActivity,
  formatCompAiActivityFromEvent,
  syncClientToCompAi,
  checkCompAiHealth,
} from "./compai-crm";
import type { BusinessPulseClient } from "./business-pulse-data";

describe("Comp AI CRM integration", () => {
  it("splits contact name into first and last name", () => {
    expect(splitContactName("Иван")).toEqual({ firstName: "Иван" });
    expect(splitContactName("Иван Иванов")).toEqual({ firstName: "Иван", lastName: "Иванов" });
    expect(splitContactName("Анна Мария Смирнова")).toEqual({ firstName: "Анна", lastName: "Мария Смирнова" });
    expect(splitContactName("   ")).toEqual({ firstName: "Клиент" });
  });

  it("formats Comp AI contact payload from BusinessPulseClient", () => {
    const client: BusinessPulseClient = {
      id: "test-1",
      name: "ООО Ромашка",
      contact: "Алексей Петров",
      phone: "+7 701 111 22 33",
      product: "construction",
      source: "WhatsApp",
      manager: "Алия",
      stage: 2,
      value: 500000,
      note: "Обсуждаем КП",
      waitingForBusiness: false,
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
      history: [],
    };

    const payload = formatCompAiContact(client);
    expect(payload).toEqual({
      firstName: "Алексей",
      lastName: "Петров",
      phone: "+7 701 111 22 33",
      title: "ООО Ромашка",
    });
  });

  it("maps pulse event types correctly", () => {
    expect(mapEventTypeToCompAiActivity("activity")).toBe("CALL");
    expect(mapEventTypeToCompAiActivity("call")).toBe("CALL");
    expect(mapEventTypeToCompAiActivity("meeting")).toBe("MEETING");
    expect(mapEventTypeToCompAiActivity("task")).toBe("TASK");
    expect(mapEventTypeToCompAiActivity("stage")).toBe("TASK");
  });

  it("formats activity payload from pulse event", () => {
    const activity = formatCompAiActivityFromEvent(
      {
        id: "ev-1",
        at: "2026-09-07T12:00:00Z",
        type: "activity",
        text: "Обсудили скидку 10%",
        actor: "Алия",
      },
      "cnt-123"
    );

    expect(activity).toEqual({
      type: "CALL",
      subject: "Обсудили скидку 10%",
      body: "Ответственный: Алия",
      contactId: "cnt-123",
    });
  });

  it("fails gracefully when API key is missing", async () => {
    const client = {
      id: "c1",
      name: "Тест",
      contact: "Тест",
      phone: "",
      product: "other",
      source: "Web",
      manager: "Алия",
      stage: 0,
      value: 0,
      note: "",
      waitingForBusiness: false,
      createdAt: "",
      updatedAt: "",
      history: [],
    } as BusinessPulseClient;

    const res = await syncClientToCompAi(client, { apiKey: "" });
    expect(res.success).toBe(false);
    expect(res.error).toContain("API-ключ");
  });

  it("syncs client successfully when server returns 200", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "contact_abc123" }),
    });

    const client = {
      id: "c1",
      name: "Тест",
      contact: "Алишер",
      phone: "+7 777 000 00 00",
      product: "construction",
      source: "Web",
      manager: "Алия",
      stage: 1,
      value: 100000,
      note: "",
      waitingForBusiness: false,
      createdAt: "",
      updatedAt: "",
      history: [],
    } as BusinessPulseClient;

    const res = await syncClientToCompAi(client, {
      apiUrl: "http://test-crm:3001",
      apiKey: "test-key",
    });

    expect(res.success).toBe(true);
    expect(res.contactId).toBe("contact_abc123");

    global.fetch = originalFetch;
  });

  it("checks Comp AI health", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok", database: "up" }),
    });

    const health = await checkCompAiHealth({ apiUrl: "http://test-crm:3001" });
    expect(health.online).toBe(true);
    expect(health.database).toBe("up");

    global.fetch = originalFetch;
  });
});