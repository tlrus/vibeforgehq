import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseServerConfig, isDemoMode } from "./config";

let serverClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  if (isDemoMode() || !hasSupabaseServerConfig()) return null;
  if (!serverClient) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    serverClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return serverClient;
}
