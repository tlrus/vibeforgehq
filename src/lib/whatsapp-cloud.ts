import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const referralSchema = z.record(z.unknown()).optional();

const messageSchema = z
  .object({
    id: z.string().min(1),
    from: z.string().optional(),
    to: z.string().optional(),
    timestamp: z.string().optional(),
    type: z.string().default("unknown"),
    text: z.object({ body: z.string() }).passthrough().optional(),
    button: z.object({ text: z.string().optional() }).passthrough().optional(),
    interactive: z
      .object({
        button_reply: z.object({ title: z.string().optional() }).passthrough().optional(),
        list_reply: z.object({ title: z.string().optional() }).passthrough().optional(),
      })
      .passthrough()
      .optional(),
    document: z
      .object({ caption: z.string().optional(), filename: z.string().optional() })
      .passthrough()
      .optional(),
    image: z.object({ caption: z.string().optional() }).passthrough().optional(),
    video: z.object({ caption: z.string().optional() }).passthrough().optional(),
    audio: z.record(z.unknown()).optional(),
    location: z
      .object({ latitude: z.number().optional(), longitude: z.number().optional() })
      .passthrough()
      .optional(),
    referral: referralSchema,
  })
  .passthrough();

const valueSchema = z
  .object({
    messaging_product: z.literal("whatsapp").optional(),
    metadata: z
      .object({
        display_phone_number: z.string().optional(),
        phone_number_id: z.string().min(1),
      })
      .passthrough(),
    contacts: z
      .array(
        z
          .object({
            wa_id: z.string().optional(),
            profile: z.object({ name: z.string().optional() }).passthrough().optional(),
          })
          .passthrough(),
      )
      .optional()
      .default([]),
    messages: z.array(messageSchema).optional().default([]),
  })
  .passthrough();

const whatsappWebhookSchema = z
  .object({
    object: z.literal("whatsapp_business_account"),
    entry: z.array(
      z
        .object({
          id: z.string().min(1),
          changes: z.array(
            z
              .object({
                field: z.string(),
                value: valueSchema,
              })
              .passthrough(),
          ),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export type WhatsAppWebhookPayload = z.infer<typeof whatsappWebhookSchema>;

export type WhatsAppMessageEnvelope = {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  externalConversationId: string;
  messageId: string;
  customerWaId: string;
  customerName: string;
  direction: "incoming" | "outgoing";
  messageType: string;
  text: string;
  occurredAt: string;
  referral: Record<string, unknown> | null;
};

export function parseWhatsAppWebhook(value: unknown): WhatsAppWebhookPayload | null {
  const parsed = whatsappWebhookSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function safeEqual(left: string | undefined | null, right: string | undefined | null) {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function verifyWhatsAppWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret = process.env.WHATSAPP_APP_SECRET,
) {
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  return safeEqual(expected, signatureHeader);
}

export function getWhatsAppWebhookChallenge(
  searchParams: URLSearchParams,
  expectedToken =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? process.env.WHATSAPP_VERIFY_TOKEN,
) {
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode !== "subscribe" || !challenge || !safeEqual(expectedToken, token)) return null;
  return challenge;
}

function getMessageText(message: z.infer<typeof messageSchema>) {
  if (message.text?.body) return message.text.body;
  if (message.button?.text) return message.button.text;
  if (message.interactive?.button_reply?.title) return message.interactive.button_reply.title;
  if (message.interactive?.list_reply?.title) return message.interactive.list_reply.title;
  if (message.document) {
    const label = message.document.filename
      ? `Документ: ${message.document.filename}`
      : "Документ";
    return message.document.caption ? `[${label}] ${message.document.caption}` : `[${label}]`;
  }
  if (message.image) return message.image.caption ? `[Фото] ${message.image.caption}` : "[Фото]";
  if (message.video) return message.video.caption ? `[Видео] ${message.video.caption}` : "[Видео]";
  if (message.audio) return "[Голосовое сообщение]";
  if (message.location) {
    const latitude = message.location.latitude;
    const longitude = message.location.longitude;
    return latitude !== undefined && longitude !== undefined
      ? `[Геолокация: ${latitude}, ${longitude}]`
      : "[Геолокация]";
  }
  return `[Сообщение WhatsApp: ${message.type}]`;
}

function occurredAt(timestamp: string | undefined) {
  if (!timestamp) return new Date().toISOString();
  const numeric = Number(timestamp);
  if (Number.isFinite(numeric)) return new Date(numeric * 1_000).toISOString();
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function extractWhatsAppMessages(
  payload: WhatsAppWebhookPayload,
  expected: { wabaId?: string; phoneNumberId?: string } = {},
): WhatsAppMessageEnvelope[] {
  const envelopes: WhatsAppMessageEnvelope[] = [];
  for (const entry of payload.entry) {
    if (expected.wabaId && entry.id !== expected.wabaId) continue;
    for (const change of entry.changes) {
      if (expected.phoneNumberId && change.value.metadata.phone_number_id !== expected.phoneNumberId) {
        continue;
      }
      if (change.field !== "messages" && change.field !== "smb_message_echoes") continue;
      const direction = change.field === "smb_message_echoes" ? "outgoing" : "incoming";
      for (const message of change.value.messages) {
        const customerWaId = direction === "incoming" ? message.from : message.to;
        if (!customerWaId) continue;
        const contact = change.value.contacts.find((candidate) => candidate.wa_id === customerWaId);
        envelopes.push({
          wabaId: entry.id,
          phoneNumberId: change.value.metadata.phone_number_id,
          displayPhoneNumber: change.value.metadata.display_phone_number ?? null,
          externalConversationId: `${change.value.metadata.phone_number_id}:${customerWaId}`,
          messageId: message.id,
          customerWaId,
          customerName: contact?.profile?.name ?? "Клиент WhatsApp",
          direction,
          messageType: message.type,
          text: getMessageText(message),
          occurredAt: occurredAt(message.timestamp),
          referral: message.referral ?? null,
        });
      }
    }
  }
  return envelopes;
}

