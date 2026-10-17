import { NextResponse } from "next/server";
import { getPilotSnapshot } from "@/lib/pilot-store";

export async function GET() {
  const snapshot = await getPilotSnapshot();
  if (!snapshot) {
    return NextResponse.json(
      { error: "Pilot database is not configured" },
      { status: 503 },
    );
  }
  return NextResponse.json({ role: "owner", ...snapshot });
}
