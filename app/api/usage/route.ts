// app/api/usage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_KEY!; 

// Service-role client (bypasses RLS)
const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function stripNulls<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)
  ) as Partial<T>;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      event,                 // Changed from 'name' to 'event' to match track function
      name,                  // Keep for backward compatibility
      meta,                  // Changed from 'props' to 'meta' to match track function
      props = {},           // Keep for backward compatibility
      page,
      session_id,
      device_id,
      user_id,
      ts,                     
    } = body ?? {};

    // Use event if provided, otherwise fall back to name
    const eventName = event || name;
    if (!eventName || typeof eventName !== "string") {
      return NextResponse.json(
        { ok: false, error: "event name is required" },
        { status: 400 }
      );
    }

    const ua = req.headers.get("user-agent") ?? null;
    const ip =
      (req.headers.get("x-forwarded-for") ?? "")
        .split(",")[0]
        ?.trim() || null;

    // Build the row and OMIT null/undefined so DB defaults (like created_at DEFAULT now()) apply
    const row: Record<string, any> = stripNulls({
      event_name: eventName, // Use the resolved event name
      properties: meta || props, // Use meta if provided, otherwise fall back to props
      page: page ?? null,
      session_id: session_id ?? null,
      device_id: device_id ?? null,
      user_id: user_id ?? null,
      user_agent: ua,
      ip_address: ip,
    });

    // Only include created_at if it parses to a valid date; otherwise omit so DEFAULT now() is used
    if (ts !== undefined && ts !== null) {
      const d = new Date(ts);
      if (!Number.isNaN(d.getTime())) {
        row.created_at = d.toISOString();
      }
    }

    const { error } = await admin.from("app_events").insert([row]);

    if (error) {
      console.error("app_events insert error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("usage route error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "unknown" },
      { status: 500 }
    );
  }
}
