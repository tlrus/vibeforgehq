import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  extractWhatsAppMessages,
  getWhatsAppWebhookChallenge,
  parseWhatsAppWebhook,
  verifyWhatsAppWebhookSignature,
} from "./whatsapp-cloud";

const incomingPayload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba-1",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "77000000000", phone_number_id: "phone-1" },
            contacts: [{ wa_id: "77770000000", profile: { name: "Ержан" } }],
            messages: [
              {
                id: "wamid.incoming-1",
                from: "77770000000",
                timestamp: "1785225600",
                type: "text",
                text: { body: "Нужны окна, сколько стоит?" },
                referral: { source_id: "ad-42", ctwa_clid: "click-1", headline: "Тепло" },
              },
            ],
          },
        },
      ],
    },
  ],
};

describe("WhatsApp Cloud API boundary", () => {
  it("validates and extracts an incoming customer message", () => {
    const parsed = parseWhatsAppWebhook(incomingPayload);
    expect(parsed).not.toBeNull();
    const [message] = extractWhatsAppMessages(parsed!, {
      wabaId: "waba-1",
      phoneNumberId: "phone-1",
    });
    expect(message).toMatchObject({
      direction: "incoming",
      customerWaId: "77770000000",
      customerName: "Ержан",
      externalConversationId: "phone-1:77770000000",
      text: "Нужны окна, сколько стоит?",
      referral: { source_id: "ad-42" },
    });
  });

  it("extracts a manager message mirrored by Coexistence", () => {
    const parsed = parseWhatsAppWebhook({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-1",
          changes: [
            {
              field: "smb_message_echoes",
              value: {
                metadata: { phone_number_id: "phone-1" },
                messages: [
                  {
                    id: "wamid.echo-1",
                    to: "77770000000",
                    timestamp: "1785225660",
                    type: "document",
                    document: { filename: "КП-Ержан.pdf", caption: "Отправляю расчёт" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const [message] = extractWhatsAppMessages(parsed!);
    expect(message).toMatchObject({
      direction: "outgoing",
      customerWaId: "77770000000",
      text: "[Документ: КП-Ержан.pdf] Отправляю расчёт",
    });
  });

  it("rejects messages for a different configured number", () => {
    const parsed = parseWhatsAppWebhook(incomingPayload)!;
    expect(extractWhatsAppMessages(parsed, { phoneNumberId: "other-phone" })).toEqual([]);
  });

  it("verifies Meta's sha256 request signature", () => {
    const raw = JSON.stringify(incomingPayload);
    const signature = `sha256=${createHmac("sha256", "app-secret").update(raw).digest("hex")}`;
    expect(verifyWhatsAppWebhookSignature(raw, signature, "app-secret")).toBe(true);
    expect(verifyWhatsAppWebhookSignature(raw, "sha256=wrong", "app-secret")).toBe(false);
  });

  it("returns the challenge only for the configured verify token", () => {
    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "verify-me",
      "hub.challenge": "123456",
    });
    expect(getWhatsAppWebhookChallenge(params, "verify-me")).toBe("123456");
    expect(getWhatsAppWebhookChallenge(params, "other-token")).toBeNull();
  });
});
