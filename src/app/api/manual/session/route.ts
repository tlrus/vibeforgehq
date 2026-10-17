import { NextResponse } from "next/server";
import { getPilotRoleFromRequest } from "@/lib/pilot-auth";

export async function GET(request: Request) {
  const role = getPilotRoleFromRequest(request);
  if (!role) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, role });
}
