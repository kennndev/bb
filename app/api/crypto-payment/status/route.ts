import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// service-role (RLS bypass)
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

interface StatusUpdateRequest {
  paymentId?: string
  transactionId?: string
  status: 'pending' | 'submitted' | 'complete' | 'failed' | 'cancelled'
  transactionHash?: string
  confirmedAt?: string
  confirmationData?: any
}

// PUT endpoint to update payment status (used by frontend)
export async function PUT(req: NextRequest) {
  try {
    const { paymentId, transactionId, status, transactionHash, confirmedAt }: StatusUpdateRequest = await req.json()
    
    if ((!paymentId && !transactionId) || !status) {
      return NextResponse.json({ error: 'Missing payment ID/transaction ID or status' }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    // Add status-specific fields
    switch (status) {
      case 'submitted':
        if (transactionHash) {
          updateData.transaction_hash = transactionHash
          updateData.submitted_at = new Date().toISOString()
        }
        break
      case 'complete':
        updateData.confirmed_at = confirmedAt || new Date().toISOString()
        if (transactionHash) {
          updateData.transaction_hash = transactionHash
        }
        break
      case 'failed':
        updateData.failed_at = new Date().toISOString()
        break
    }

    // Build the query
    let query = admin.from('crypto_payments').update(updateData)
    
    if (paymentId) {
      query = query.eq('id', paymentId)
    } else if (transactionId) {
      query = query.eq('transaction_id', transactionId)
    }

    const { data: updatedPayment, error: updateError } = await query
      .select(`
        id,
        transaction_id,
        status,
        amount_cents,
        transaction_hash,
        created_at,
        submitted_at,
        confirmed_at,
        failed_at,
        buyer_id,
        listing_id
      `)
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 })
    }

    if (!updatedPayment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    // If payment is complete, process the order (same logic as POST method)
    if (status === 'complete' && updatedPayment.listing_id) {
      try {
        // Check if marketplace transaction already exists
        const { data: existingTransaction } = await admin
          .from('marketplace_transactions')
          .select('id')
          .eq('crypto_payment_id', updatedPayment.id)
          .single()

        if (!existingTransaction) {
          // Get listing details
          const { data: listing } = await admin
            .from('marketplace_listings')
            .select('seller_id')
            .eq('id', updatedPayment.listing_id)
            .single()

          // Create marketplace transaction record
          await admin.from('marketplace_transactions').insert({
            buyer_id: updatedPayment.buyer_id,
            listing_id: updatedPayment.listing_id,
            seller_id: listing?.seller_id,
            amount_cents: updatedPayment.amount_cents,
            currency: 'USD',
            status: 'completed',
            payment_method: 'crypto',
            crypto_payment_id: updatedPayment.id,
            transaction_hash: transactionHash,
            created_at: updatedPayment.confirmed_at || updatedPayment.created_at,
            updated_at: new Date().toISOString(),
            credited_at: new Date().toISOString()
          })

          // Keep listing active for digital marketplace (don't mark as sold)
          await admin
            .from('marketplace_listings')
            .update({
              // status: 'active', // Keep active for multiple purchases
              updated_at: new Date().toISOString()
            })
            .eq('id', updatedPayment.listing_id)

          console.log('✅ Order processed successfully for crypto payment:', updatedPayment.id)
        }
      } catch (orderError) {
        console.error('Failed to process order:', orderError)
        // Don't fail the status update if order processing fails
      }
    }

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      message: `Payment status updated to ${status}`,
    })

  } catch (error) {
    console.error('Crypto payment status update error:', error)
    return NextResponse.json({ error: 'Status update failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { paymentId, status, transactionHash, confirmationData }: StatusUpdateRequest = await req.json()
    
    if (!paymentId || !status) {
      return NextResponse.json({ error: 'Missing payment ID or status' }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    // Add status-specific fields
    switch (status) {
      case 'submitted':
        if (transactionHash) {
          updateData.transaction_hash = transactionHash
          updateData.submitted_at = new Date().toISOString()
        }
        break
      case 'complete':
        updateData.confirmed_at = new Date().toISOString()
        if (confirmationData) {
          updateData.confirmation_data = confirmationData
        }
        break
      case 'failed':
        updateData.failed_at = new Date().toISOString()
        if (confirmationData) {
          updateData.failure_reason = confirmationData.reason
        }
        break
    }

    // Update the crypto payment record
    const { data: updatedPayment, error: updateError } = await admin
      .from('crypto_payments')
      .update(updateData)
      .eq('id', paymentId)
      .select(`
        id,
        transaction_id,
        status,
        amount_cents,
        buyer_id,
        listing_id,
        transaction_hash,
        created_at,
        submitted_at,
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

    // If payment is complete, process the order
    if (status === 'complete' && updatedPayment.listing_id) {
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
        // Don't fail the status update if order processing fails
      }
    }

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      message: `Payment status updated to ${status}`,
    })

  } catch (error) {
    console.error('Crypto payment status update error:', error)
    return NextResponse.json({ error: 'Status update failed' }, { status: 500 })
  }
}

// GET endpoint to check payment status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get('paymentId')
    const transactionId = searchParams.get('transactionId')

    if (!paymentId && !transactionId) {
      return NextResponse.json({ error: 'Missing payment ID or transaction ID' }, { status: 400 })
    }

    let query = admin.from('crypto_payments').select(`
      id,
      transaction_id,
      status,
      amount_cents,
      base_amount_cents,
      tax_amount_cents,
      tax_rate_percentage,
      receiving_address,
      transaction_hash,
      created_at,
      submitted_at,
      confirmed_at,
      failed_at,
      company,
      address,
      address_line_2,
      city,
      state,
      zipcode,
      country,
      order_id,
      order_items
    `)

    if (paymentId) {
      query = query.eq('id', paymentId)
    } else if (transactionId) {
      query = query.eq('transaction_id', transactionId)
    }

    const { data: payment, error } = await query.single()

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json({ error: 'Failed to fetch payment status' }, { status: 500 })
    }

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      payment,
    })

  } catch (error) {
    console.error('Crypto payment status fetch error:', error)
    return NextResponse.json({ error: 'Status fetch failed' }, { status: 500 })
  }
}
