// app/api/crypto-payment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/stripe'
import Taxjar from 'taxjar'

export const dynamic = 'force-dynamic'

// === Config =====================================================================================

// If you want to force-tax for specific destinations during testing, set this to true
// and add real nexus addresses below. Keep false in production unless you truly have nexus.
const ENABLE_TEST_NEXUS = false as const

// Example nexus map for testing (fill with your REAL nexus locations only)
const TEST_NEXUS_ADDRESSES: Record<string, { country: string; state: string; zip: string; city: string; street: string }[]> = {
  // US-IL example (Springfield). Add more states/regions as needed.
  'US-IL': [
    { country: 'US', state: 'IL', zip: '62704', city: 'Springfield', street: '10 Example Rd' }
  ],
  // Canada-ON example:
  'CA-ON': [
    { country: 'CA', state: 'ON', zip: 'M5H2N2', city: 'Toronto', street: '123 Queen St W' }
  ],
}

// service-role (RLS bypass)
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Crypto payment receiving address
const CRYPTO_RECEIVING_ADDRESS = '0x9aE153b6C37D812e1BE8C55Ff0dd73c879cb34F8'

// TaxJar client
const taxjar = new Taxjar({
  apiKey: process.env.TAXJAR_API_KEY || '5fc8b688d4ff26db51cc9702b001e7c3'
})

interface ShippingAddress {
  email?: string
  name?: string
  company?: string
  line1: string              // form field
  line2?: string
  address?: string           // db field
  addressLine2?: string
  city: string
  state: string
  postal_code: string        // form field
  zipcode?: string           // db field
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

// Helpers ----------------------------------------------------------------------------------------

function buildTestNexus(country: string, state: string) {
  if (!ENABLE_TEST_NEXUS) return undefined
  const key = `${country}-${state}`
  const entries = TEST_NEXUS_ADDRESSES[key]
  if (!entries?.length) return undefined
  return entries.map((e, idx) => ({
    id: `nexus-${key.toLowerCase()}-${idx}`,
    country: e.country,
    state: e.state,
    zip: e.zip,
    city: e.city,
    street: e.street,
  }))
}

function cents(n: number) {
  return Math.round(n * 100)
}

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

    // Map form fields to database fields
    const address = shippingAddress.address || shippingAddress.line1
    const zipcode = shippingAddress.zipcode || shippingAddress.postal_code
    const addressLine2 = shippingAddress.addressLine2 || shippingAddress.line2

    // Validate required address fields
    if (!address || !shippingAddress.city || !shippingAddress.state || !zipcode || !shippingAddress.country) {
      return NextResponse.json({ 
        error: 'Missing required address fields: address, city, state, zipcode, and country are required' 
      }, { status: 400 })
    }

    // Get user (allow anonymous purchases)
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    const buyerId = user?.id || null

    // Pricing: product only (no shipping for crypto)
    const unitPriceUsd = 9.00
    const quantityInt = Math.max(1, Math.floor(quantity))
    const baseAmountUsd = unitPriceUsd * quantityInt
    const baseAmountCents = cents(baseAmountUsd)
    const totalBeforeTaxCents = baseAmountCents // Product only (no shipping)

    // === Tax calculation (TaxJar) ===============================================================

    let taxRatePct = 0
    let taxAmountCents = 0

    // Build nexus (optional for testing)
    const testNexus = buildTestNexus(shippingAddress.country, shippingAddress.state)

    // Invariant guard: amount must equal Σ(line_items), shipping must be 0
    const payloadAmount = totalBeforeTaxCents / 100
    const sumLineItems = unitPriceUsd * quantityInt
    if (Number(payloadAmount.toFixed(2)) !== Number(sumLineItems.toFixed(2))) {
      return NextResponse.json({ error: 'Tax payload mismatch: amount must equal sum(line_items).' }, { status: 400 })
    }

    console.log('🧾 TaxJar Tax Calculation Details:')
    console.log('   Base Amount (USD):', baseAmountUsd.toFixed(2))
    console.log('   Country/State/City/Zip:', shippingAddress.country, shippingAddress.state, shippingAddress.city, zipcode)
    console.log('   Using test nexus:', !!testNexus)

    try {
      console.log('   Calling TaxJar API...')
      
      const taxArgs: any = {
        from_country: 'US',
        from_zip: '89108',
        from_state: 'NV',
        from_city: 'Las Vegas',
        to_country: shippingAddress.country,
        to_zip: zipcode,
        to_state: shippingAddress.state,
        to_city: shippingAddress.city,
        to_street: address,
        amount: payloadAmount,   // equals Σ(line_items)
        shipping: 0,             // no shipping in crypto flow
        line_items: [
          {
            id: 'card-001',
            quantity: quantityInt,
            unit_price: unitPriceUsd,
            // IMPORTANT: omit product_tax_code for general taxable goods OR use "00000"
            // product_tax_code: '00000',
          }
        ]
      }

      if (testNexus) {
        taxArgs.nexus_addresses = testNexus
      }

      const taxCalculation = await taxjar.taxForOrder(taxArgs)

      console.log('   TaxJar Response:', {
        rate: taxCalculation.tax.rate,
        amount_to_collect: taxCalculation.tax.amount_to_collect,
        taxable_amount: taxCalculation.tax.taxable_amount,
        freight_taxable: taxCalculation.tax.freight_taxable,
      })

      if (taxCalculation.tax.breakdown) {
        console.log('   📊 Breakdown:', {
          tax_collectable: taxCalculation.tax.breakdown.tax_collectable,
          combined_tax_rate: taxCalculation.tax.breakdown.combined_tax_rate,
          by_juris: {
            state_amount: taxCalculation.tax.breakdown.state_tax_collectable,
            county_amount: taxCalculation.tax.breakdown.county_tax_collectable,
            city_amount: taxCalculation.tax.breakdown.city_tax_collectable,
            special_amount: taxCalculation.tax.breakdown.special_district_tax_collectable,
          }
        })
      }

      // Use TaxJar amounts directly
      taxRatePct = +(taxCalculation.tax.rate * 100).toFixed(4) // e.g., 9.75
      taxAmountCents = Math.round(taxCalculation.tax.amount_to_collect * 100)

      console.log('   ✅ Tax computed:', {
        taxRatePct,
        taxAmountUsd: (taxAmountCents / 100).toFixed(2),
      })

    } catch (taxError) {
      console.warn('   ⚠️ TaxJar API failed:', taxError)

      // Fallback: Stripe Tax (optional)
      try {
        console.log('   🔄 Trying Stripe Tax as fallback...')
        const stripeTaxCalculation = await stripe.tax.calculations.create({
          currency: 'usd',
          line_items: [
            {
              amount: totalBeforeTaxCents,
              reference: 'crypto_payment_fallback',
              tax_code: 'txcd_99999999',
              tax_behavior: 'exclusive'
            },
          ],
          customer_details: {
            address: {
              country: shippingAddress.country,
              state: shippingAddress.state,
              city: shippingAddress.city,
              postal_code: zipcode,
              line1: address,
              line2: addressLine2,
            },
          },
        })
        
        if (stripeTaxCalculation.tax_amount_exclusive > 0) {
          taxRatePct = +( (stripeTaxCalculation.tax_amount_exclusive / totalBeforeTaxCents) * 100 ).toFixed(4)
          taxAmountCents = Math.round(stripeTaxCalculation.tax_amount_exclusive)
          console.log('   ✅ Stripe Tax fallback computed:', {
            taxRatePct,
            taxAmountUsd: (taxAmountCents / 100).toFixed(2),
          })
        }
      } catch (stripeTaxError) {
        console.warn('   ⚠️ Stripe Tax fallback also failed:', stripeTaxError)
      }
    }
    
    const totalAmountCents = totalBeforeTaxCents + taxAmountCents
    console.log('   💰 Final Amounts:')
    console.log('      Base: $' + (baseAmountCents / 100).toFixed(2))
    console.log('      Shipping: $0.00 (crypto flow)')
    console.log('      Tax: $' + (taxAmountCents / 100).toFixed(2))
    console.log('      Total: $' + (totalAmountCents / 100).toFixed(2))

    // Generate ids
    const transactionId = `crypto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const orderId = `923${String(Date.now()).slice(-3)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`

    // Save record
    const { data: cryptoPayment, error: dbError } = await admin
      .from('crypto_payments')
      .insert({
        transaction_id: transactionId,
        buyer_id: user?.id || null,
        listing_id: listingId || null,

        amount_cents: totalAmountCents,           // Product + Tax (no shipping)
        base_amount_cents: totalBeforeTaxCents,   // Product only
        tax_amount_cents: taxAmountCents,
        tax_rate_percentage: taxRatePct,          // e.g., 9.75

        currency: 'USD',
        status: 'pending',
        receiving_address: CRYPTO_RECEIVING_ADDRESS,

        company: shippingAddress.company || null,
        address: address,
        address_line_2: addressLine2 || null,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipcode: zipcode,
        country: shippingAddress.country,

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
          payment_method: 'crypto',
          tax_calculation_source: 'taxjar_api',
          ...(customImageUrl && { custom_image_url: customImageUrl }),
          ...(cartItems && { cart_items: cartItems }),
          ...(listingId && { listing_id: listingId })
        },
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
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

    return NextResponse.json({
      success: true,
      transactionId,
      amount: totalAmountCents,
      baseAmount: baseAmountCents,
      shippingAmount: 0,
      taxAmount: taxAmountCents,
      taxRate: taxRatePct,
      receivingAddress: CRYPTO_RECEIVING_ADDRESS,
      paymentId: cryptoPayment.id,
      message: `Please send $${(totalAmountCents / 100).toFixed(2)} USD worth of crypto to the address below.`,
    })

  } catch (error) {
    console.error('Crypto payment creation error:', error)
    return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 })
  }
}
