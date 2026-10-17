import { createHmac, timingSafeEqual } from "node:crypto";

export type PilotRole = "owner" | "manager";

function safeEqual(left: string | undefined, right: string | null | undefined) {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createPilotSession(role: PilotRole, now = Date.now()) {
  const secret = process.env.PILOT_SESSION_SECRET;
  if (!secret) throw new Error("PILOT_SESSION_SECRET is not configured");
  const payload = Buffer.from(
    JSON.stringify({ role, expiresAt: now + 14 * 24 * 60 * 60 * 1_000 }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyPilotSession(value: string | null, now = Date.now()): PilotRole | null {
  const secret = process.env.PILOT_SESSION_SECRET;
  if (!secret || !value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (!safeEqual(expected, signature)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      role?: string;
      expiresAt?: number;
    };
    if (
      (parsed.role !== "owner" && parsed.role !== "manager") ||
      !parsed.expiresAt ||
      parsed.expiresAt <= now
    ) {
      return null;
    }
    return parsed.role;
  } catch {
    return null;
  }
}

export function getPilotRoleFromRequest(request: Request): PilotRole | null {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (safeEqual(process.env.PILOT_OWNER_API_TOKEN, bearer)) return "owner";
  if (safeEqual(process.env.PILOT_MANAGER_API_TOKEN, bearer)) return "manager";
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("vf_pilot_session="))
    ?.slice("vf_pilot_session=".length);
  return verifyPilotSession(cookie ? decodeURIComponent(cookie) : null);
}

export function getPilotRoleForPassword(password: string): PilotRole | null {
  if (safeEqual(process.env.PILOT_OWNER_PASSWORD, password)) return "owner";
  if (safeEqual(process.env.PILOT_MANAGER_PASSWORD, password)) return "manager";
  return null;
}
