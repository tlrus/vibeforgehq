type Environment = Record<string, string | undefined>;

export function hasSupabasePublicConfig(env: Environment = process.env) {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function hasSupabaseServerConfig(env: Environment = process.env) {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
}

export function isDemoMode(env: Environment = process.env) {
  return env.DEMO_MODE !== "false" || !hasSupabaseServerConfig(env);
}
