import { NextResponse, type NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: tx, error } = await admin
    .from('marketplace_transactions') // Updated table name
    .select('seller_id') // Updated column name - we'll get seller's stripe account from profiles
    .eq('stripe_payment_intent_id', id) // Updated column name
    .single()

  if (error || !tx) {
    return NextResponse.json({ error: 'Tx not found' }, { status: 404 })
  }

  // All payments go to main account - no Stripe Connect accounts
  const intent = await stripe.paymentIntents.retrieve(id)

  return NextResponse.json({ intent, tx })
}
