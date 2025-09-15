import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// service-role (RLS bypass)
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

interface WebhookRequest {
  paymentId: string
  transactionHash: string
  status: 'confirmed' | 'failed'
  blockNumber?: number
  gasUsed?: string
  confirmationData?: any
}

export async function POST(req: NextRequest) {
  try {
    const { paymentId, transactionHash, status, blockNumber, gasUsed, confirmationData }: WebhookRequest = await req.json()
    
    if (!paymentId || !transactionHash || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Update the crypto payment record
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'confirmed') {
      updateData.confirmed_at = new Date().toISOString()
      updateData.block_number = blockNumber
      updateData.gas_used = gasUsed
      if (confirmationData) {
        updateData.confirmation_data = confirmationData
      }
    } else if (status === 'failed') {
      updateData.failed_at = new Date().toISOString()
      if (confirmationData) {
        updateData.failure_reason = confirmationData.reason
      }
    }

    const { data: updatedPayment, error: updateError } = await admin
      .from('crypto_payments')
      .update(updateData)
      .eq('id', paymentId)
      .eq('transaction_hash', transactionHash)
      .select(`
        id,
        transaction_id,
        status,
        amount_cents,
        buyer_id,
        listing_id,
        created_at,
        confirmed_at,
        failed_at
      `)
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 })
    }

    if (!updatedPayment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    // If payment is confirmed, process the order
    if (status === 'confirmed' && updatedPayment.listing_id) {
      try {
        // Create marketplace transaction record
        await admin.from('marketplace_transactions').insert({
          buyer_id: updatedPayment.buyer_id,
          listing_id: updatedPayment.listing_id,
          amount_cents: updatedPayment.amount_cents,
          currency: 'USD',
          status: 'completed',
          payment_method: 'crypto',
          crypto_payment_id: updatedPayment.id,
          transaction_hash: transactionHash,
        })

        console.log('✅ Order processed successfully for crypto payment:', updatedPayment.id)
      } catch (orderError) {
        console.error('Failed to process order:', orderError)
        // Don't fail the webhook if order processing fails
      }
    }

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      message: `Payment status updated to ${status}`,
    })

  } catch (error) {
    console.error('Crypto payment webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
