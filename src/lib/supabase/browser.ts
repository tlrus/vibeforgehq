"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabasePublicConfig } from "./config";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "false" || !hasSupabasePublicConfig()) return null;
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}
