import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// service-role (RLS bypass)
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// No platform fees - all money goes to main account

export async function POST(req: NextRequest) {
  try {
    const { 
      listingId, 
      quantity = 1, 
      includeDisplayCase = false, 
      displayCaseQuantity = 1,
      cardFinish = 'matte',
      shippingAddress 
    } = await req.json()
    
    if (!listingId) {
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 })
    }

    // IMPORTANT: pass the *function* `cookies` to the helper, not a resolved store
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    // Allow anonymous purchases - user can be null
    const buyerId = user?.id || null

  // Get listing
  const { data: listing, error: listErr } = await admin
    .from('marketplace_listings') // Updated table name
    .select('id, price_cents, currency, status, seller_id')
    .eq('id', listingId)
    .single()

  if (listErr || !listing || !(listing.status === 'active')) { // Updated status check
    return NextResponse.json({ error: 'Listing unavailable' }, { status: 409 })
  }

  // All sales go to main account - no Stripe Connect required

  // Calculate total price including quantity, card finish, and display case
  const basePrice = listing.price_cents
  const cardFinishPrice = (cardFinish === 'rainbow' || cardFinish === 'gloss') ? 400 : 0 // $4.00 in cents
  const basePriceWithFinish = basePrice + cardFinishPrice
  
  // Apply bulk discount tiers (same as custom cards)
  let pricePerCard = basePriceWithFinish
  let discountPercentage = 0
  
  if (quantity >= 10) {
    discountPercentage = 50
    pricePerCard = Math.floor(basePriceWithFinish * 0.50)
  } else if (quantity >= 5) {
    discountPercentage = 35
    pricePerCard = Math.floor(basePriceWithFinish * 0.65)
  } else if (quantity >= 2) {
    discountPercentage = 25
    pricePerCard = Math.floor(basePriceWithFinish * 0.75)
  }
  
  const cardsTotalCents = pricePerCard * quantity
  
  // Add display case if requested
  const displayCasePriceCents = 1900 // $19.00 in cents
  const displayCaseTotalCents = includeDisplayCase ? (displayCasePriceCents * displayCaseQuantity) : 0
  
  const cents = cardsTotalCents + displayCaseTotalCents

  // No platform fees - all money goes to main account

  // Reuse pending tx if exists (only for authenticated users)
  let open = null
  if (buyerId) {
    const { data } = await admin
      .from('marketplace_transactions') // Updated table name
      .select('id, stripe_payment_intent_id') // Updated column name
      .eq('listing_id', listing.id)
      .eq('buyer_id', buyerId)
      .eq('status', 'pending')
      .maybeSingle()
    open = data
  }

  const makePI = async (): Promise<Stripe.PaymentIntent> =>
    stripe.paymentIntents.create({
      amount: cents,
      currency: (listing.currency || 'USD').toLowerCase(),
      metadata: {
        marketplace_listing_id: listing.id,
        marketplace_buyer_id: buyerId || 'anonymous',
        marketplace_seller_id: listing.seller_id,
        quantity: quantity.toString(),
        card_finish: cardFinish,
        include_display_case: includeDisplayCase.toString(),
        display_case_quantity: displayCaseQuantity.toString(),
        base_price_cents: basePrice.toString(),
        price_per_card_cents: pricePerCard.toString(),
        discount_percentage: discountPercentage.toString(),
        total_price_cents: cents.toString(),
      },
    })

  let intent: Stripe.PaymentIntent
  if (open?.stripe_payment_intent_id) {
    intent = await stripe.paymentIntents.retrieve(open.stripe_payment_intent_id)
    if (intent.status !== 'requires_payment_method') {
      intent = await makePI()
      await admin
        .from('marketplace_transactions') // Updated table name
        .update({
          stripe_payment_intent_id: intent.id, // Updated column name
          platform_fee_cents: 0, // No platform fees
          amount_cents: cents,
          currency: (listing.currency || 'USD').toUpperCase(),
        })
        .eq('id', open.id)
    }
  } else {
    intent = await makePI()
    await admin.from('marketplace_transactions').insert({ // Updated table name
      buyer_id: buyerId, // Can be null for anonymous buyers
      listing_id: listing.id,
      seller_id: listing.seller_id, // Added seller_id
      amount_cents: cents,
      currency: (listing.currency || 'USD').toUpperCase(),
      stripe_payment_intent_id: intent.id, // Updated column name
      status: 'pending',
      platform_fee_cents: 0, // No platform fees
    })
  }

  return NextResponse.json({
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    stripeAccount: null, // No Stripe Connect
  })
  } catch (error) {
    console.error('Payment intent creation error:', error)
    return NextResponse.json({ error: 'Payment intent creation failed' }, { status: 500 })
  }
}
