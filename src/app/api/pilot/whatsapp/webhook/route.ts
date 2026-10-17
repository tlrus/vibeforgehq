import { after, NextResponse } from "next/server";
import { recordPilotError } from "@/lib/pilot-store";
import {
  getWhatsAppWebhookChallenge,
  parseWhatsAppWebhook,
  verifyWhatsAppWebhookSignature,
} from "@/lib/whatsapp-cloud";
import { processWhatsAppPilotWebhook } from "@/lib/whatsapp-orchestrator";

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const challenge = getWhatsAppWebhookChallenge(url.searchParams);
  if (!challenge) return apiError(403, "WEBHOOK_VERIFICATION_FAILED", "Invalid verify token");
  return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(request: Request) {
  if (!process.env.WHATSAPP_APP_SECRET) {
    return apiError(503, "WHATSAPP_NOT_CONFIGURED", "WhatsApp app secret is not configured");
  }
  const rawBody = await request.text();
  if (
    !verifyWhatsAppWebhookSignature(
      rawBody,
      request.headers.get("x-hub-signature-256"),
    )
  ) {
    return apiError(401, "INVALID_SIGNATURE", "Invalid Meta webhook signature");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawBody);
  } catch {
    return apiError(400, "INVALID_JSON", "Invalid JSON payload");
  }
  const payload = parseWhatsAppWebhook(raw);
  if (!payload) {
    return apiError(400, "INVALID_PAYLOAD", "Invalid WhatsApp webhook payload");
  }

  after(() =>
    processWhatsAppPilotWebhook(payload).catch((error) =>
      recordPilotError({ scope: "whatsapp_webhook", error }).catch(() => undefined),
    ),
  );
  return NextResponse.json({ received: true });
}

