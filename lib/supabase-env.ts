// lib/supabase-env.ts
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

/** Resolve public URL/anon key (browser/SSR) */
export function getPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  if (!anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return { url, anon };
}

/** Resolve service role (server-only) */
export function getServiceSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  if (!service) throw new Error("Missing SUPABASE_SERVICE_KEY");
  return { url, service };
}
