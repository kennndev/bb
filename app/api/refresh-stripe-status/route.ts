// app/api/refresh-stripe-status/route.ts
import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

// Server-role client (SERVER ONLY)
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // renamed to match our convention
)

export async function POST(req: Request) {
  // Stripe Connect removed - no need to refresh status
  return NextResponse.json({ verified: false, message: "Stripe Connect removed" })
}
