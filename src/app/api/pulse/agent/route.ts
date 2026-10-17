import { NextResponse } from "next/server";
import {
  generateClientBrief,
  suggestNextAction,
  extractFacts,
  fallbackClientBrief,
  fallbackNextAction,
  fallbackExtractFacts,
} from "@/lib/pulse-agent";
import type { BusinessPulseClient } from "@/lib/business-pulse-data";

export async function GET() {
  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  return NextResponse.json({
    status: "ok",
    agent: "Comp AI Pulse Agent",
    provider: hasKey ? "openai" : "heuristic",
    model: hasKey ? process.env.OPENAI_MODEL || "gpt-5-mini" : "local-heuristic",
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: "brief" | "suggest_next" | "extract_facts";
      client?: BusinessPulseClient;
      mode?: 'rules' | 'configured';
    };

    if (!body.client) {
      return NextResponse.json(
        { success: false, error: "Данные клиента не переданы" },
        { status: 400 }
      );
    }

    const action = body.action || "brief";

    if (body.mode === 'rules') {
      const result = action === 'suggest_next' ? fallbackNextAction(body.client) : action === 'extract_facts' ? fallbackExtractFacts(body.client) : fallbackClientBrief(body.client);
      return NextResponse.json({ success: true, action, data: result });
    }

    if (action === "suggest_next") {
      const result = await suggestNextAction(body.client);
      return NextResponse.json({ success: true, action, data: result });
    }

    if (action === "extract_facts") {
      const result = await extractFacts(body.client);
      return NextResponse.json({ success: true, action, data: result });
    }

    // Default: brief
    const result = await generateClientBrief(body.client);
    return NextResponse.json({ success: true, action: "brief", data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Ошибка AI-агента: ${msg}` },
      { status: 500 }
    );
  }
}
