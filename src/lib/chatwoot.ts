import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { PILOT_EVENT_TYPES, type PilotEventType } from "./pilot-domain";

const idSchema = z.union([z.string(), z.number()]);
const attributesSchema = z.record(z.unknown()).optional().default({});

const chatwootWebhookSchema = z
  .object({
    event: z.string(),
    id: idSchema,
    content: z.string().nullable().optional(),
    message_type: z.union([z.literal("incoming"), z.literal("outgoing"), z.number()]).optional(),
    private: z.boolean().optional().default(false),
    created_at: z.union([z.string(), z.number()]).optional(),
    content_attributes: attributesSchema,
    additional_attributes: attributesSchema,
    attachments: z.array(z.record(z.unknown())).optional().default([]),
    sender: z
      .object({
        id: idSchema.optional(),
        name: z.string().optional(),
        phone_number: z.string().optional(),
      })
      .passthrough()
      .optional(),
    conversation: z
      .object({
        id: idSchema,
        inbox_id: idSchema.optional(),
        custom_attributes: attributesSchema,
        additional_attributes: attributesSchema,
        meta: z
          .object({
            sender: z
              .object({
                id: idSchema.optional(),
                name: z.string().optional(),
                phone_number: z.string().optional(),
              })
              .passthrough()
              .optional(),
            assignee: z
              .object({
                id: idSchema.optional(),
                name: z.string().optional(),
                available_name: z.string().optional(),
              })
              .passthrough()
              .nullable()
              .optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

export type ChatwootWebhookPayload = z.infer<typeof chatwootWebhookSchema>;

export function parseChatwootWebhook(value: unknown): ChatwootWebhookPayload | null {
  const result = chatwootWebhookSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function getChatwootMessageDirection(payload: ChatwootWebhookPayload) {
  if (payload.message_type === "incoming" || payload.message_type === 0) return "incoming" as const;
  if (payload.message_type === "outgoing" || payload.message_type === 1) return "outgoing" as const;
  return null;
}

export function verifyChatwootWebhookToken(received: string | null) {
  const expected = process.env.CHATWOOT_WEBHOOK_TOKEN;
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function getChatwootContact(payload: ChatwootWebhookPayload) {
  const contact = payload.conversation.meta?.sender ?? payload.sender;
  return {
    name: contact?.name ?? "Новый клиент",
    phone: contact?.phone_number ?? null,
  };
}

export function getChatwootManager(payload: ChatwootWebhookPayload) {
  const assignee = payload.conversation.meta?.assignee;
  return assignee?.name ?? assignee?.available_name ?? null;
}

export function getChatwootEvidenceEvent(payload: ChatwootWebhookPayload): PilotEventType | null {
  const candidates = [
    payload.content_attributes.vibeforge_event,
    payload.conversation.custom_attributes.vibeforge_event,
  ];
  for (const value of candidates) {
    if (
      typeof value === "string" &&
      (PILOT_EVENT_TYPES as readonly string[]).includes(value) &&
      !value.startsWith("AI_") &&
      value !== "CUSTOMER_MESSAGE_RECEIVED"
    ) {
      return value as PilotEventType;
    }
  }
  return null;
}

function getChatwootConfig() {
  const baseUrl = process.env.CHATWOOT_BASE_URL?.replace(/\/+$/, "");
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;
  const accessToken = process.env.CHATWOOT_API_ACCESS_TOKEN;
  if (!baseUrl || !accountId || !accessToken) return null;
  return { baseUrl, accountId, accessToken };
}

export function getChatwootConversationUrl(conversationId: string | number) {
  const config = getChatwootConfig();
  if (!config) return null;
  return `${config.baseUrl}/app/accounts/${config.accountId}/conversations/${conversationId}`;
}

export async function createChatwootPrivateNote(
  conversationId: string | number,
  content: string,
) {
  const config = getChatwootConfig();
  if (!config) return { delivered: false as const, reason: "not_configured" as const };
  const response = await fetch(
    `${config.baseUrl}/api/v1/accounts/${config.accountId}/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        api_access_token: config.accessToken,
      },
      body: JSON.stringify({
        content,
        message_type: "outgoing",
        private: true,
        content_type: "text",
        content_attributes: { source: "vibeforge_pilot", ai_draft: true },
      }),
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!response.ok) throw new Error(`Chatwoot private note returned ${response.status}`);
  return { delivered: true as const };
}

export async function getRecentChatwootMessages(
  conversationId: string | number,
  limit = 5,
) {
  const config = getChatwootConfig();
  if (!config) return [];
  const response = await fetch(
    `${config.baseUrl}/api/v1/accounts/${config.accountId}/conversations/${conversationId}/messages`,
    {
      headers: { api_access_token: config.accessToken },
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!response.ok) throw new Error(`Chatwoot messages returned ${response.status}`);
  const body = (await response.json()) as {
    payload?: Array<{
      content?: string | null;
      message_type?: number | "incoming" | "outgoing";
      private?: boolean;
    }>;
  };
  return (body.payload ?? [])
    .filter((message) => !message.private && message.content)
    .slice(-limit)
    .map((message) => ({
      direction:
        message.message_type === 0 || message.message_type === "incoming"
          ? ("customer" as const)
          : ("manager" as const),
      content: message.content!,
    }));
}
