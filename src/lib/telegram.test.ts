import { afterEach, describe, expect, it, vi } from "vitest";
import { sendTelegramPilotNotification } from "./telegram";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Telegram pilot notification", () => {
  it("skips delivery until the pilot bot is configured", async () => {
    await expect(
      sendTelegramPilotNotification({
        customerName: "Клиент",
        stage: "DIALOG",
        suggestion: "Уточнить срок.",
      }),
    ).resolves.toEqual({ delivered: false, reason: "not_configured" });
  });

  it("sends the suggestion to the manager, not the customer", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "bot-token");
    vi.stubEnv("TELEGRAM_MANAGER_CHAT_ID", "manager-chat");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendTelegramPilotNotification({
      customerName: "Клиент",
      stage: "DIALOG",
      suggestion: "Уточнить срок.",
      conversationUrl: "https://chat.example.com/conversation/7",
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body.chat_id).toBe("manager-chat");
    expect(body.text).toContain("AI-черновик");
    expect(body.reply_markup.inline_keyboard[0][0].url).toContain("chat.example.com");
  });
});
