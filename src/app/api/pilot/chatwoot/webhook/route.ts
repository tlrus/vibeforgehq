import { after, NextResponse } from "next/server";
import { parseChatwootWebhook, verifyChatwootWebhookToken } from "@/lib/chatwoot";
import { processChatwootPilotWebhook } from "@/lib/pilot-orchestrator";
import { recordPilotError } from "@/lib/pilot-store";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const token =
    request.headers.get("x-vibeforge-webhook-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("token");
  if (!verifyChatwootWebhookToken(token)) {
    return NextResponse.json({ error: "Invalid webhook token" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const payload = parseChatwootWebhook(raw);
  if (!payload) return NextResponse.json({ error: "Invalid Chatwoot payload" }, { status: 400 });

  after(() =>
    processChatwootPilotWebhook(payload).catch((error) =>
      recordPilotError({ scope: "chatwoot_webhook", error }).catch(() => undefined),
    ),
  );
  return NextResponse.json({ received: true });
}
