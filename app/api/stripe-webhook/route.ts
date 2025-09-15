// app/api/stripe-webhook/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* ---------------- Supabase admin client ---------------- */

function getAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY")
  return createClient(url, key)
}

/* ---------------- helpers ---------------- */

// Stripe Connect functionality removed



// Stripe Connect payouts removed - all money goes to main account

/* ---------------- core: mark tx + grant access ---------------- */

async function completeTxAndGrant(pi: Stripe.PaymentIntent) {
  const admin = getAdmin()
  
  console.log("[wh] Processing payment_intent.succeeded", { 
    piId: pi.id, 
    amount: pi.amount, 
    currency: pi.currency
  })

  // Direct update by stripe_payment_intent_id
  console.log("[wh] Updating transaction directly")
  const { data: directUpdate, error: directError } = await admin
    .from("marketplace_transactions")
    .update({ 
      status: "completed", 
      payment_status: "succeeded",
      updated_at: new Date().toISOString() 
    })
    .eq("stripe_payment_intent_id", pi.id)
    .select("id")
  
  if (directError) {
    console.error("[wh] Direct update by stripe_id failed:", directError.message)
  } else if (directUpdate && directUpdate.length > 0) {
    console.log("[wh] Successfully updated transaction by stripe_id:", directUpdate[0].id)
    return
  } else {
    console.warn("[wh] No transaction found with stripe_payment_intent_id:", pi.id)
    console.log("[wh] Available payment intent IDs in database:", 
      await admin.from("marketplace_transactions").select("stripe_payment_intent_id, status"))
  }

  // Asset ownership transfer handled by triggers in the database
  // No need for manual access grants in the new schema

  // All money goes to main account - no payouts needed
}

/* ---------------- credits (unchanged behavior) ---------------- */

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const admin = getAdmin()
  const md = (session.metadata ?? {}) as any
  
  console.log("[wh] DEBUG - Session received:", {
    sessionId: session.id,
    metadata: md,
    amount: session.amount_total,
    currency: session.currency,
    paymentIntent: session.payment_intent
  })
  
  if (md.kind !== "credits_purchase") {
    console.log("[wh] DEBUG - Not a credits purchase, skipping. Kind:", md.kind)
    return
  }

  const userId = md.userId as string | undefined
  const credits = parseInt(md.credits ?? "0", 10)
  const amount_cents = session.amount_total ?? 0
  const piId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || session.id

  console.log("[wh] payload", { userId, credits, piId, amount_cents })
  if (!userId || !credits || credits <= 0 || !piId) {
    console.warn("[wh] Invalid payload, skipping", { userId, credits, piId })
    return
  }

  // 1) Try to write the ledger. If it's a duplicate (23505), we STOP here.
  const { data: ledgerData, error: ledgerErr } = await admin
    .from("credits_ledger")
    .insert({
      user_id: userId,
      amount: credits,  // Use 'amount' instead of 'credits'
      reason: "purchase",
      reference_id: piId,  // Use 'reference_id' instead of 'payment_intent'
      metadata: { amount_cents, payment_intent: piId }  // Store extra data in metadata
    })
    .select("reference_id") // returns row only on success

  if (ledgerErr) {
    if ((ledgerErr as any).code === "23505") {
      // Duplicate reference_id → credits already granted earlier; do nothing.
      console.log("[wh] duplicate reference_id; skipping increment", { piId })
      return
    }
    console.error("[wh] ledger insert error:", ledgerErr)
    return
  }

  if (!ledgerData || ledgerData.length === 0) {
    // Safety: if nothing returned, don't risk double increment.
    console.warn("[wh] ledger insert returned no rows; skipping increment")
    return
  }

  console.log("[wh] ledger insert ok", { piId })

  // 2) Increment profiles.credits (no RPC). Only runs when ledger insert succeeded.
  const { data: prof, error: readErr } = await admin
    .from("profiles") // Updated table name
    .select("credits")
    .eq("id", userId)
    .single()

  // PGRST116 = row not found (first-time user is fine)
  if (readErr && (readErr as any).code !== "PGRST116") {
    console.error("[wh] profile read failed:", readErr)
    return
  }

  const current = Number(prof?.credits ?? 0)
  const next = current + credits

  const { error: upErr } = await admin
    .from("profiles") // Updated table name
    .upsert({ id: userId, credits: next }, { onConflict: "id" })

  if (upErr) {
    console.error("[wh] profile upsert failed:", upErr)
    return
  }

  console.log("[wh] granted", { userId, credits, payment_intent: piId, newBalance: next })
}

/* ---------------- route (synchronous!) ---------------- */

export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer())
  const sig = req.headers.get("stripe-signature") ?? ""

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return new NextResponse("webhook secret missing", { status: 500 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (e) {
    console.error("[wh] bad signature:", (e as any)?.message)
    return new NextResponse("bad sig", { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case "payment_intent.succeeded":
        await completeTxAndGrant(event.data.object as Stripe.PaymentIntent)
        break

      // Fallback: some setups only subscribe to charge.succeeded
      case "charge.succeeded": {
        const ch = event.data.object as Stripe.Charge
        const piId =
          typeof ch.payment_intent === "string"
            ? ch.payment_intent
            : ch.payment_intent?.id
        if (piId) {
          const pi = await stripe.paymentIntents.retrieve(piId)
          await completeTxAndGrant(pi)
        }
        break
      }

      default:
        // ignore others
        break
    }
  } catch (err) {
    console.error("[wh] handler error:", err)
    // Let Stripe retry on 5xx
    return new NextResponse("error", { status: 500 })
  }

  // ACK after work is done (prevents "pending" rows)
  return NextResponse.json({ received: true })
}
