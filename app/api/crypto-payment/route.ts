// app/api/crypto-payment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/stripe'
import Taxjar from 'taxjar'

export const dynamic = 'force-dynamic'

// ===== Supabase (service-role; RLS bypass) ======================================================
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// ===== Config ===================================================================================
const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const CRYPTO_RECEIVING_ADDRESS = '0x9aE153b6C37D812e1BE8C55Ff0dd73c879cb34F8' // Your wallet address for receiving USDC

const taxjar = new Taxjar({
  apiKey: process.env.TAXJAR_API_KEY || '5fc8b688d4ff26db51cc9702b001e7c3'
})

// ===== Types ====================================================================================
interface ShippingAddress {
  email?: string
  name?: string
  company?: string
  line1: string           // form field
  line2?: string
  address?: string        // db field
  addressLine2?: string
  city: string
  state: string
  postal_code: string     // form field
  zipcode?: string        // db field
  country: string
}

interface CryptoPaymentRequest {
  listingId?: string
  quantity?: number
  includeDisplayCase?: boolean
  displayCaseQuantity?: number
  cardFinish?: string
  shippingAddress: ShippingAddress
  orderItems?: string
  customImageUrl?: string
  cartItems?: any[]
}

// ===== Helpers ==================================================================================
const cents = (n: number) => Math.round(n * 100)

const normalizeState = (country: string, state: string) => {
  const c = (country || '').toUpperCase()
  if (c === 'US' || c === 'CA') return (state || '').slice(0, 2).toUpperCase()
  return state
}

const safePct = (fraction: number) => Number((fraction * 100).toFixed(4))

// ===== Route ====================================================================================
export async function POST(req: NextRequest) {
  try {
    const {
      listingId,
      quantity = 1,
      includeDisplayCase = false,
      displayCaseQuantity = 1,
      cardFinish = 'matte',
      shippingAddress,
      orderItems = 'Custom Card',
      customImageUrl,
      cartItems
    }: CryptoPaymentRequest = await req.json()

    if (!shippingAddress) {
      return NextResponse.json({ error: 'Missing shipping address' }, { status: 400 })
    }

    console.log('🔍 Received shipping address:', shippingAddress)

    // Map/normalize address fields
    const address = shippingAddress.address || shippingAddress.line1
    const zipcode = shippingAddress.zipcode || shippingAddress.postal_code
    const country = (shippingAddress.country || '').toUpperCase()
    const state = normalizeState(country, shippingAddress.state)

    if (!address || !shippingAddress.city || !state || !zipcode || !country) {
      console.log('❌ Missing required fields:', {
        address: !!address,
        city: !!shippingAddress.city,
        state: !!state,
        zipcode: !!zipcode,
        country: !!country,
        shippingAddress
      })
      return NextResponse.json({
        error: 'Missing required address fields: address, city, state, zipcode, and country are required'
      }, { status: 400 })
    }

    // Get user (anonymous allowed)
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    const buyerId = user?.id || null

    // ===== Pricing (product only; NO shipping for crypto) ======================================
    const unitPriceUsd = 9.00
    const quantityInt = Math.max(1, Math.floor(quantity))
    const baseAmountUsd = unitPriceUsd * quantityInt
    const baseAmountCents = cents(baseAmountUsd)
    const totalBeforeTaxCents = baseAmountCents

    // ===== Tax (TaxJar first; Stripe Tax fallback) =============================================
    let taxRatePct = 0
    let taxAmountCents = 0

    // Invariant: TaxJar `amount` must equal Σ(line_items), shipping must be 0
    const payloadAmount = totalBeforeTaxCents / 100
    const sumLineItems = unitPriceUsd * quantityInt
    if (Number(payloadAmount.toFixed(2)) !== Number(sumLineItems.toFixed(2))) {
      return NextResponse.json({ error: 'Tax payload mismatch: amount must equal sum(line_items).' }, { status: 400 })
    }

    console.log('🧾 Tax: start', {
      baseAmountUsd: baseAmountUsd.toFixed(2),
      destination: { country, state, city: shippingAddress.city, zipcode },
    })

    try {
      const taxArgs: any = {
        from_country: 'US',
        from_zip: '89108',
        from_state: 'NV',
        from_city: 'Las Vegas',

        to_country: country,
        to_zip: zipcode,
        to_state: state,
        to_city: shippingAddress.city,
        to_street: address,

        amount: payloadAmount,   // equals Σ(line_items)
        shipping: 0,             // crypto flow excludes shipping

        line_items: [
          {
            id: 'card-001',
            quantity: quantityInt,
            unit_price: unitPriceUsd,
            //product_tax_code: 'A_GEN_TAX' // General tax (works for most jurisdictions)
          }
        ],
      }

      const taxCalculation = await taxjar.taxForOrder(taxArgs)

      console.log('🧾 TaxJar response brief:', {
        has_nexus: taxCalculation.tax.has_nexus,
        rate: taxCalculation.tax.rate,
        amount_to_collect: taxCalculation.tax.amount_to_collect,
        taxable_amount: taxCalculation.tax.taxable_amount,
        freight_taxable: taxCalculation.tax.freight_taxable
      })

      // Prefer the top-level rate; fall back to breakdown.combined_tax_rate if present
      const rateDecimal =
        (typeof taxCalculation.tax.rate === 'number' && taxCalculation.tax.rate) ||
        (taxCalculation.tax.breakdown?.combined_tax_rate ?? 0)

      taxRatePct = safePct(rateDecimal)
      taxAmountCents = Math.round((taxCalculation.tax.amount_to_collect || 0) * 100)

      console.log('✅ Tax computed (TaxJar):', {
        taxRatePct,
        taxAmountUsd: (taxAmountCents / 100).toFixed(2),
      })
    } catch (taxError) {
      console.warn('⚠️ TaxJar failed; trying Stripe Tax fallback', taxError)

      try {
        const stripeCalc = await stripe.tax.calculations.create({
          currency: 'usd',
          line_items: [
            {
              amount: totalBeforeTaxCents,
              reference: 'crypto_payment_fallback',
              tax_code: 'txcd_99999999',
              tax_behavior: 'exclusive',
            },
          ],
          customer_details: {
            address: {
              country,
              state,
              city: shippingAddress.city,
              postal_code: zipcode,
              line1: address,
              line2: shippingAddress.addressLine2 || shippingAddress.line2,
            },
          },
        })

        if (stripeCalc.tax_amount_exclusive > 0) {
          taxAmountCents = Math.round(stripeCalc.tax_amount_exclusive)
          taxRatePct = safePct(stripeCalc.tax_amount_exclusive / totalBeforeTaxCents)
          console.log('✅ Tax computed (Stripe fallback):', {
            taxRatePct,
            taxAmountUsd: (taxAmountCents / 100).toFixed(2),
          })
        }
      } catch (stripeTaxError) {
        console.warn('⚠️ Stripe Tax fallback failed', stripeTaxError)
      }
    }

    // ===== Totals ===============================================================================
    const totalAmountCents = totalBeforeTaxCents + taxAmountCents

    console.log('💰 Totals:', {
      base: (baseAmountCents / 100).toFixed(2),
      shipping: '0.00 (crypto flow)',
      tax: (taxAmountCents / 100).toFixed(2),
      total: (totalAmountCents / 100).toFixed(2),
      taxRatePct
    })

    // ===== IDs ==================================================================================
    const transactionId = `crypto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const orderId = `923${String(Date.now()).slice(-3)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`

    // ===== Persist ==============================================================================
    const { data: cryptoPayment, error: dbError } = await admin
      .from('crypto_payments')
      .insert({
        transaction_id: transactionId,
        buyer_id: buyerId,
        listing_id: listingId || null,

        amount_cents: totalAmountCents,           // Product + Tax (no shipping)
        base_amount_cents: totalBeforeTaxCents,   // Product only (before tax)
        tax_amount_cents: taxAmountCents,
        tax_rate_percentage: taxRatePct,          // e.g., 13.0

        currency: 'USD',
        status: 'pending',
        receiving_address: CRYPTO_RECEIVING_ADDRESS,
        usdc_contract_address: USDC_CONTRACT_ADDRESS,

        company: shippingAddress.company || null,
        address,
        address_line_2: shippingAddress.addressLine2 || shippingAddress.line2 || null,
        city: shippingAddress.city,
        state,
        zipcode,
        country,

        order_id: orderId,
        order_items: orderItems,

        quantity: quantityInt,
        include_display_case: includeDisplayCase,
        display_case_quantity: displayCaseQuantity,
        card_finish: cardFinish,

        pounds: null,
        length: null,
        width: null,
        height: null,

        metadata: {
          payment_method: 'usdc',
          token_type: 'USDC',
          usdc_contract_address: USDC_CONTRACT_ADDRESS,
          tax_calculation_source: 'taxjar_api',
          ...(customImageUrl && { custom_image_url: customImageUrl }),
          ...(cartItems && { cart_items: cartItems }),
          ...(listingId && { listing_id: listingId }),
        },
      })
      .select()
      .single()

    if (dbError) {
      console.error('DB insert error:', dbError)
      return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
    }

    console.log('✅ Payment saved:', {
      id: cryptoPayment.id,
      transaction_id: cryptoPayment.transaction_id,
      amount_cents: cryptoPayment.amount_cents,
      tax_amount_cents: cryptoPayment.tax_amount_cents,
      tax_rate_percentage: cryptoPayment.tax_rate_percentage,
      status: cryptoPayment.status
    })

    // ===== Response =============================================================================
    return NextResponse.json({
      success: true,
      transactionId,
      amount: totalAmountCents,         // cents
      baseAmount: baseAmountCents,      // cents
      shippingAmount: 0,                // cents
      taxAmount: taxAmountCents,        // cents
      taxRate: taxRatePct,              // %
      receivingAddress: CRYPTO_RECEIVING_ADDRESS,
      usdcContractAddress: USDC_CONTRACT_ADDRESS,
      tokenType: 'USDC',
      paymentId: cryptoPayment.id,
      message: `Please send $${(totalAmountCents / 100).toFixed(2)} USDC to the address below.`,
    })
  } catch (error) {
    console.error('Crypto payment creation error:', error)
    return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 })
  }
}
