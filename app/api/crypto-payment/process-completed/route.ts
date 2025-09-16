// app/api/crypto-payment/process-completed/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { paymentId } = await req.json()
    
    if (!paymentId) {
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 })
    }

    // Get the crypto payment record
    const { data: payment, error: paymentError } = await admin
      .from('crypto_payments')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status !== 'complete') {
      return NextResponse.json({ error: 'Payment is not completed' }, { status: 400 })
    }

    if (!payment.listing_id) {
      return NextResponse.json({ error: 'No listing ID for this payment' }, { status: 400 })
    }

    // Get listing details
    const { data: listing, error: listingError } = await admin
      .from('marketplace_listings')
      .select('*')
      .eq('id', payment.listing_id)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Check if marketplace transaction already exists
    const { data: existingTransaction } = await admin
      .from('marketplace_transactions')
      .select('id')
      .eq('crypto_payment_id', payment.id)
      .single()

    if (existingTransaction) {
      return NextResponse.json({ 
        success: true, 
        message: 'Transaction already processed',
        transactionId: existingTransaction.id
      })
    }

    // Create marketplace transaction
    const { data: transaction, error: transactionError } = await admin
      .from('marketplace_transactions')
      .insert({
        buyer_id: payment.buyer_id,
        listing_id: payment.listing_id,
        seller_id: listing.seller_id,
        amount_cents: payment.amount_cents,
        currency: 'USD',
        status: 'completed',
        payment_method: 'crypto',
        crypto_payment_id: payment.id,
        transaction_hash: payment.transaction_hash,
        created_at: payment.confirmed_at || payment.created_at,
        updated_at: new Date().toISOString(),
        credited_at: new Date().toISOString()
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Failed to create marketplace transaction:', transactionError)
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
    }

    // Keep listing active for digital marketplace (don't mark as sold)
    const { error: updateError } = await admin
      .from('marketplace_listings')
      .update({
        // status: 'active', // Keep active for multiple purchases
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.listing_id)

    if (updateError) {
      console.error('Failed to update listing status:', updateError)
      // Don't fail the whole operation if this fails
    }

    console.log('✅ Successfully processed completed crypto payment:', payment.id)

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      transactionId: transaction.id,
      payment: {
        id: payment.id,
        transaction_id: payment.transaction_id,
        amount_cents: payment.amount_cents,
        buyer_id: payment.buyer_id,
        listing_id: payment.listing_id
      }
    })

  } catch (error) {
    console.error('Process completed payment error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
