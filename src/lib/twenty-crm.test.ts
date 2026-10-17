import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseTwentyWebhook, syncLeadToTwenty, verifyTwentyWebhook } from "./twenty-crm";

afterEach(() => vi.unstubAllEnvs());

describe("Twenty CRM bridge", () => {
  it("does not make a request until a workflow webhook is configured", async () => {
    vi.stubEnv("TWENTY_WORKFLOW_WEBHOOK_URL", "");
    await expect(syncLeadToTwenty({
      externalId: "lead-1",
      name: "Клиент",
      phone: "masked",
      source: "WhatsApp",
      stage: "NEW",
      leadTemperature: "cold",
      updatedAt: new Date(0).toISOString(),
    })).resolves.toEqual({ synced: false, reason: "not_configured" });
  });

  it("validates the HMAC signature over the exact raw body", () => {
    const secret = "test-secret";
    const timestamp = "1721712000";
    const raw = JSON.stringify({ event: "person.updated", data: { id: "p1" }, timestamp });
    vi.stubEnv("TWENTY_WEBHOOK_SECRET", secret);
    const signature = createHmac("sha256", secret).update(`${timestamp}:${raw}`).digest("hex");
    expect(verifyTwentyWebhook(raw, signature, timestamp)).toBe(true);
    expect(verifyTwentyWebhook(`${raw} `, signature, timestamp)).toBe(false);
    expect(parseTwentyWebhook(raw)?.event).toBe("person.updated");
  });
});
