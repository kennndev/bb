// lib/supabase-service.ts (SERVER ONLY)
import { createClient } from "@supabase/supabase-js";
import { getServiceSupabaseEnv, getPublicSupabaseEnv } from "./supabase-env";

const { url, service } = getServiceSupabaseEnv();
export const supabase = createClient(url, service);

// -- Header-token resolver (kept from your file)
export async function getUserFromAuthHeader(authHeader?: string | null) {
  if (!authHeader) return null;
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    // Validate token using public anon key context (auth endpoint)
    const { anon } = getPublicSupabaseEnv();
    const verifier = createClient(url, anon);
    const { data, error } = await verifier.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

// ---- Shared types (kept intact) ----
export type WebhookEvent = {
  event_id: string;
  event_type: string;
  processed_at?: string;
  correlation_id?: string;
  created_at?: string;
};

export type CustomerPurchase = {
  id?: string;
  customer_id: string;
  purchase_data: Record<string, unknown>;
  created_at?: string;
};

export type UserRightsRequest = {
  id?: string;
  customer_id: string;
  request_type: string;
  request_data: Record<string, unknown>;
  created_at?: string;
};
