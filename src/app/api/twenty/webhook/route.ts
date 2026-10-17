import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { parseTwentyWebhook, verifyTwentyWebhook } from "@/lib/twenty-crm";

const temperatureValues = new Set(["cold", "warm", "hot"]);

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-twenty-webhook-signature");
  const timestamp = request.headers.get("x-twenty-webhook-timestamp");
  if (!verifyTwentyWebhook(rawBody, signature, timestamp)) {
    return NextResponse.json({ error: "Invalid Twenty signature" }, { status: 401 });
  }

  const payload = parseTwentyWebhook(rawBody);
  if (!payload) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  if (!payload.event.startsWith("person.")) return NextResponse.json({ received: true });

  const externalIdField = process.env.TWENTY_EXTERNAL_ID_FIELD || "vibeForgeId";
  const stageField = process.env.TWENTY_STAGE_FIELD || "dealStage";
  const temperatureField = process.env.TWENTY_TEMPERATURE_FIELD || "leadTemperature";
  const externalId = String(payload.data[externalIdField] || "");
  if (!externalId) return NextResponse.json({ received: true, mapped: false });

  const changes: Record<string, unknown> = {
    twenty_person_id: String(payload.data.id || ""),
    updated_at: new Date().toISOString(),
  };
  if (payload.data[stageField]) changes.status = String(payload.data[stageField]);
  if (temperatureValues.has(String(payload.data[temperatureField]))) {
    changes.lead_temperature = String(payload.data[temperatureField]);
  }

  const client = getSupabaseServerClient();
  if (client) await client.from("leads").update(changes).eq("id", externalId);
  return NextResponse.json({ received: true, mapped: Boolean(client) });
}
