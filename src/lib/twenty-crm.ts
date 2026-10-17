import { createHmac, timingSafeEqual } from "node:crypto";

export type TwentyLeadSync = {
  externalId: string;
  name: string;
  phone: string;
  source: "WhatsApp" | "Instagram" | "Website" | "Demo";
  stage: string;
  manager?: string | null;
  leadTemperature: "cold" | "warm" | "hot";
  painSummary?: string | null;
  needSummary?: string | null;
  updatedAt: string;
};

export type TwentyWebhookPayload = {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
};

export async function syncLeadToTwenty(input: TwentyLeadSync) {
  const webhookUrl = process.env.TWENTY_WORKFLOW_WEBHOOK_URL;
  if (!webhookUrl) return { synced: false as const, reason: "not_configured" as const };
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Twenty workflow returned ${response.status}`);
  return { synced: true as const };
}

export function verifyTwentyWebhook(rawBody: string, signature: string | null, timestamp: string | null) {
  const secret = process.env.TWENTY_WEBHOOK_SECRET;
  if (!secret || !signature || !timestamp) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}:${rawBody}`).digest("hex");
  const receivedBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function parseTwentyWebhook(rawBody: string): TwentyWebhookPayload | null {
  try {
    const value = JSON.parse(rawBody) as Partial<TwentyWebhookPayload>;
    if (!value.event || !value.data || !value.timestamp) return null;
    return value as TwentyWebhookPayload;
  } catch {
    return null;
  }
}
