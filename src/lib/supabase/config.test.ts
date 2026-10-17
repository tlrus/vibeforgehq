import { describe, expect, it } from "vitest";
import { hasSupabasePublicConfig, isDemoMode } from "./config";

describe("Supabase configuration", () => {
  it("keeps demo mode on when keys are missing", () => {
    expect(isDemoMode({ DEMO_MODE: "false" })).toBe(true);
  });
  it("recognizes configured public credentials", () => {
    expect(hasSupabasePublicConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon" })).toBe(true);
  });
  it("allows live mode when server credentials exist", () => {
    expect(isDemoMode({ DEMO_MODE: "false", NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "service" })).toBe(false);
  });
});
