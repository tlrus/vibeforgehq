import { NextResponse } from "next/server";
import { checkCompAiHealth, syncClientToCompAi } from "@/lib/compai-crm";
import type { BusinessPulseClient } from "@/lib/business-pulse-data";

export async function GET() {
  const health = await checkCompAiHealth();
  return NextResponse.json({
    configured: Boolean(process.env.COMPAI_CRM_API_KEY),
    url: process.env.COMPAI_CRM_URL || "http://localhost:3001",
    online: health.online,
    database: health.database,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      client?: BusinessPulseClient;
      clients?: BusinessPulseClient[];
    };

    const clientsToSync: BusinessPulseClient[] = body.clients
      ? body.clients
      : body.client
      ? [body.client]
      : [];

    if (clientsToSync.length === 0) {
      return NextResponse.json(
        { error: "No client data provided" },
        { status: 400 }
      );
    }

    const results = [];
    for (const client of clientsToSync) {
      const res = await syncClientToCompAi(client);
      results.push({
        clientId: client.id,
        name: client.name,
        success: res.success,
        contactId: res.contactId,
        error: res.error,
      });
    }

    const successfulCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: successfulCount > 0,
      total: clientsToSync.length,
      synced: successfulCount,
      results,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}