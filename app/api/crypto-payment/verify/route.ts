import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// service-role (RLS bypass)
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

interface VerifyRequest {
  paymentId: string
  transactionHash: string
}

export async function POST(req: NextRequest) {
  try {
    const { paymentId, transactionHash }: VerifyRequest = await req.json()
    
    if (!paymentId || !transactionHash) {
      return NextResponse.json({ error: 'Missing payment ID or transaction hash' }, { status: 400 })
    }

    // Update the crypto payment record with transaction hash
    const { data: updatedPayment, error: updateError } = await admin
      .from('crypto_payments')
      .update({
        transaction_hash: transactionHash,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select()
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json({ error: 'Failed to update payment record' }, { status: 500 })
    }

    if (!updatedPayment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    // TODO: Here you would typically:
    // 1. Verify the transaction on the blockchain
    // 2. Check if the amount matches
    // 3. Update status to 'confirmed' when verified
    // 4. Process the order (create marketplace transaction, etc.)

    return NextResponse.json({
      success: true,
      message: 'Transaction submitted successfully. Payment verification is in progress.',
      paymentId: updatedPayment.id,
      status: updatedPayment.status,
    })

  } catch (error) {
    console.error('Crypto payment verification error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}

