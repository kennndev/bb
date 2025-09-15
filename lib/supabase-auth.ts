// lib/supabase-auth.ts
/**
 * Anonymous + regular session handling for uploads.
 * Keeps prior behavior: attempt anonymous sign-in if no session.
 */
import { getSupabaseBrowserClient } from "./supabase-browser";

/** Ensure user is authenticated (anonymously if needed). Returns session or null. */
export async function ensureAuthenticated() {
  const supabase = getSupabaseBrowserClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    console.log("✅ User already authenticated");
    return session;
  }

  console.log("🔐 Signing in anonymously for secure upload...");
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error("❌ Anonymous sign-in failed:", error);
    return null; // keep original fallback behavior
  }
  console.log("✅ Anonymous authentication successful");
  return data.session;
}

/** Explicit sign-out (used by his code) */
export async function signOut() {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
