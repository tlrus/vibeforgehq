import { NextResponse } from "next/server";
import { getPilotConversations } from "@/lib/pilot-store";

export async function GET() {
  const conversations = await getPilotConversations();
  if (!conversations) {
    return NextResponse.json(
      { error: "Pilot database is not configured" },
      { status: 503 },
    );
  }

  return NextResponse.json({ conversations });
}
