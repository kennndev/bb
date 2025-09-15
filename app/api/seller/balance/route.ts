// app/api/seller/balance/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { stripe } from "@/lib/stripe"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function admin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY")
  return createClient(url, key)
}

function aggregateAmounts(
  rows: Array<{ currency: string; amount: number }>
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const cur = (r.currency || "usd").toUpperCase()
    out[cur] = (out[cur] ?? 0) + (r.amount || 0)
  }
  return out
}

export async function GET(_req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const a = admin()

  // Since Stripe Connect was removed, all sales go to main account
  // No need to check for connect account anymore
  const acct = null

  // 1) Stripe balance (Express/Custom only)
  let stripeBalance: {
    available?: Record<string, number>
    pending?: Record<string, number>
    instant_available?: Record<string, number>
    livemode?: boolean
  } | null = null

  if (acct) {
    try {
      const bal = await stripe.balance.retrieve({}, { stripeAccount: acct })
      stripeBalance = {
        available: aggregateAmounts(bal.available),
        pending: aggregateAmounts(bal.pending),
        instant_available: aggregateAmounts(bal.instant_available ?? []),
        livemode: bal.livemode,
      }
    } catch (err: any) {
      // If the account is "Standard", this call isn't allowed from the platform.
      console.warn("[seller/balance] stripe.balance.retrieve failed:", err?.message)
      stripeBalance = null
    }
  }

  // 2) Your DB totals as a fallback / lifetime stats
  //    (net = amount_cents - platform_fee_cents)
  const { data: listings } = await a
    .from("marketplace_listings") // Updated table name
    .select("id")
    .eq("seller_id", user.id)

  const listingIds = (listings ?? []).map((r) => r.id)
  let totals: Record<
    string,
    { gross: number; fee: number; net: number; net_completed: number; net_pending: number }
  > = {}

  if (listingIds.length) {
    const { data: txs } = await a
      .from("marketplace_transactions") // Updated table name
      .select("amount_cents, platform_fee_cents, currency, status, listing_id")
      .in("listing_id", listingIds)

    for (const t of txs ?? []) {
      const cur = (t.currency || "USD").toUpperCase()
      const gross = Number(t.amount_cents || 0)
      const fee   = Number(t.platform_fee_cents || 0)
      const net   = Math.max(0, gross - fee)
      if (!totals[cur]) totals[cur] = { gross: 0, fee: 0, net: 0, net_completed: 0, net_pending: 0 }
      totals[cur].gross += gross
      totals[cur].fee   += fee
      totals[cur].net   += net
      if (t.status === "completed") totals[cur].net_completed += net
      if (t.status === "pending")   totals[cur].net_pending   += net
    }
  }

  return NextResponse.json({
    connected: false, // No Stripe Connect accounts anymore
    stripeAccount: null,
    stripeBalance: null, // No connect account balance
    totals, // Still show transaction totals from database
  })
}
