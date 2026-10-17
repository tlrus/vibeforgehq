import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createChatwootPrivateNote,
  getChatwootEvidenceEvent,
  getChatwootMessageDirection,
  parseChatwootWebhook,
  verifyChatwootWebhookToken,
} from "./chatwoot";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const payload = {
  event: "message_created",
  id: 101,
  content: "Нужен расчет",
  message_type: "incoming",
  private: false,
  content_attributes: {},
  conversation: { id: 77, custom_attributes: {}, meta: {} },
};

describe("Chatwoot pilot bridge", () => {
  it("parses incoming messages and ignores AI-only stage suggestions", () => {
    const parsed = parseChatwootWebhook(payload)!;
    expect(getChatwootMessageDirection(parsed)).toBe("incoming");
    expect(getChatwootEvidenceEvent(parsed)).toBeNull();

    const withEvidence = parseChatwootWebhook({
      ...payload,
      message_type: "outgoing",
      content_attributes: { vibeforge_event: "QUOTE_SENT" },
    })!;
    expect(getChatwootEvidenceEvent(withEvidence)).toBe("QUOTE_SENT");
  });

  it("requires the configured webhook token", () => {
    vi.stubEnv("CHATWOOT_WEBHOOK_TOKEN", "secret");
    expect(verifyChatwootWebhookToken("secret")).toBe(true);
    expect(verifyChatwootWebhookToken("wrong")).toBe(false);
  });

  it("creates a private note and never a customer message", async () => {
    vi.stubEnv("CHATWOOT_BASE_URL", "https://chat.example.com");
    vi.stubEnv("CHATWOOT_ACCOUNT_ID", "1");
    vi.stubEnv("CHATWOOT_API_ACCESS_TOKEN", "token");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await createChatwootPrivateNote(77, "Черновик");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      content: "Черновик",
      message_type: "outgoing",
      private: true,
    });
  });
});
