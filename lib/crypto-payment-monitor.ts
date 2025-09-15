import { createClient } from '@supabase/supabase-js'

// service-role (RLS bypass)
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

interface TransactionStatus {
  hash: string
  status: 'pending' | 'confirmed' | 'failed'
  blockNumber?: number
  gasUsed?: string
}

/**
 * Monitor blockchain transactions and update payment status
 * This would typically be called by a cron job or webhook
 */
export async function monitorCryptoPayments() {
  try {
    // Get all pending crypto payments with transaction hashes
    const { data: pendingPayments, error } = await admin
      .from('crypto_payments')
      .select('id, transaction_hash, receiving_address, amount_cents')
      .eq('status', 'submitted')
      .not('transaction_hash', 'is', null)

    if (error) {
      console.error('Error fetching pending payments:', error)
      return
    }

    if (!pendingPayments || pendingPayments.length === 0) {
      console.log('No pending crypto payments to monitor')
      return
    }

    console.log(`Monitoring ${pendingPayments.length} pending crypto payments`)

    // Check each transaction status
    for (const payment of pendingPayments) {
      try {
        const txStatus = await checkTransactionStatus(payment.transaction_hash)
        
        if (txStatus.status === 'confirmed') {
          await updatePaymentStatus(payment.id, 'confirmed', {
            blockNumber: txStatus.blockNumber,
            gasUsed: txStatus.gasUsed,
          })
          console.log(`✅ Payment ${payment.id} confirmed`)
        } else if (txStatus.status === 'failed') {
          await updatePaymentStatus(payment.id, 'failed', {
            reason: 'Transaction failed on blockchain',
          })
          console.log(`❌ Payment ${payment.id} failed`)
        }
      } catch (error) {
        console.error(`Error monitoring payment ${payment.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Error in crypto payment monitoring:', error)
  }
}

/**
 * Check transaction status on Base Sepolia blockchain
 * Using Base Sepolia RPC endpoint
 */
async function checkTransactionStatus(txHash: string): Promise<TransactionStatus> {
  try {
    // Base Sepolia RPC endpoint
    const baseSepoliaRPC = 'https://sepolia.base.org'
    
    // Check transaction receipt
    const response = await fetch(baseSepoliaRPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1,
      }),
    })

    const data = await response.json()
    
    if (data.error) {
      console.error('RPC error:', data.error)
      return {
        hash: txHash,
        status: 'failed',
      }
    }

    const receipt = data.result
    
    if (!receipt) {
      // Transaction not yet mined
      return {
        hash: txHash,
        status: 'pending',
      }
    }

    // Check if transaction was successful
    if (receipt.status === '0x1') {
      return {
        hash: txHash,
        status: 'confirmed',
        blockNumber: parseInt(receipt.blockNumber, 16),
        gasUsed: receipt.gasUsed,
      }
    } else {
      return {
        hash: txHash,
        status: 'failed',
        blockNumber: parseInt(receipt.blockNumber, 16),
        gasUsed: receipt.gasUsed,
      }
    }
  } catch (error) {
    console.error('Error checking transaction status on Base Sepolia:', error)
    return {
      hash: txHash,
      status: 'failed',
    }
  }
}

/**
 * Update payment status in database
 */
async function updatePaymentStatus(
  paymentId: string, 
  status: 'confirmed' | 'failed', 
  data?: any
) {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'confirmed') {
      updateData.confirmed_at = new Date().toISOString()
      if (data?.blockNumber) updateData.block_number = data.blockNumber
      if (data?.gasUsed) updateData.gas_used = data.gasUsed
    } else if (status === 'failed') {
      updateData.failed_at = new Date().toISOString()
      if (data?.reason) updateData.failure_reason = data.reason
    }

    const { error } = await admin
      .from('crypto_payments')
      .update(updateData)
      .eq('id', paymentId)

    if (error) {
      console.error('Error updating payment status:', error)
      throw error
    }

    // If confirmed, process the order
    if (status === 'confirmed') {
      await processConfirmedPayment(paymentId)
    }
  } catch (error) {
    console.error('Error in updatePaymentStatus:', error)
    throw error
  }
}

/**
 * Process confirmed payment and create order
 */
async function processConfirmedPayment(paymentId: string) {
  try {
    // Get payment details
    const { data: payment, error: paymentError } = await admin
      .from('crypto_payments')
      .select('id, listing_id, buyer_id, amount_cents, transaction_hash')
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      console.error('Error fetching payment for processing:', paymentError)
      return
    }

    if (!payment.listing_id) {
      console.log('No listing ID for payment, skipping order processing')
      return
    }

    // Create marketplace transaction
    const { error: orderError } = await admin
      .from('marketplace_transactions')
      .insert({
        buyer_id: payment.buyer_id,
        listing_id: payment.listing_id,
        amount_cents: payment.amount_cents,
        currency: 'USD',
        status: 'completed',
        payment_method: 'crypto',
        crypto_payment_id: payment.id,
        transaction_hash: payment.transaction_hash,
      })

    if (orderError) {
      console.error('Error creating marketplace transaction:', orderError)
      throw orderError
    }

    console.log(`✅ Order processed for crypto payment ${paymentId}`)
  } catch (error) {
    console.error('Error processing confirmed payment:', error)
    throw error
  }
}
