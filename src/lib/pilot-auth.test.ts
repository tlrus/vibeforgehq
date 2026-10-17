import { afterEach, describe, expect, it, vi } from "vitest";
import { createPilotSession, getPilotRoleForPassword, verifyPilotSession } from "./pilot-auth";

afterEach(() => vi.unstubAllEnvs());

describe("pilot roles", () => {
  it("creates an expiring signed owner session", () => {
    vi.stubEnv("PILOT_SESSION_SECRET", "session-secret");
    const token = createPilotSession("owner", 1_000);
    expect(verifyPilotSession(token, 2_000)).toBe("owner");
    expect(verifyPilotSession(token, 15 * 24 * 60 * 60 * 1_000)).toBeNull();
  });

  it("separates owner and manager passwords", () => {
    vi.stubEnv("PILOT_OWNER_PASSWORD", "owner-password");
    vi.stubEnv("PILOT_MANAGER_PASSWORD", "manager-password");
    expect(getPilotRoleForPassword("owner-password")).toBe("owner");
    expect(getPilotRoleForPassword("manager-password")).toBe("manager");
    expect(getPilotRoleForPassword("wrong")).toBeNull();
  });
});
