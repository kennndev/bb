import { v4 as uuidv4 } from "uuid"

const KEY = "cardify.device_id"

export function getDeviceId(): string {
  if (typeof window === "undefined") return uuidv4()
  const cached = localStorage.getItem(KEY)
  if (cached) return cached
  const fresh = uuidv4()
  localStorage.setItem(KEY, fresh)
  return fresh
}

export async function track(
  event: "generate" | "upload" | "buy",
  meta?: Record<string, any>,
  status: "ok" | "error" = "ok",
  durationMs?: number
) {
  try {
    // Get user ID if available (for authenticated users)
    let userId = null;
    if (typeof window !== "undefined") {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id || null;
      } catch {
        // Ignore auth errors in analytics
      }
    }

    await fetch("/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        event, 
        status, 
        durationMs, 
        meta, 
        deviceId: getDeviceId(),
        user_id: userId
      }),
      keepalive: true, // lets it fire during navigations
    })
  } catch { /* don't block UX on analytics */ }
}
