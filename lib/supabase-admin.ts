// lib/supabase-admin.ts (SERVER ONLY)
import { createClient } from "@supabase/supabase-js";
import { getServiceSupabaseEnv } from "./supabase-env";

const { url, service } = getServiceSupabaseEnv(); // service role
export const supabaseAdmin = createClient(url, service);
