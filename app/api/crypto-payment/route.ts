import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/stripe'
import Taxjar from 'taxjar'
import { getShippingCostForCountry } from '@/lib/shipping-utils'

export const dynamic = 'force-dynamic'

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

// Shipping costs are now imported from shared utility

interface ShippingAddress {
  email?: string
  name?: string
  company?: string
  line1: string  // This is what the form sends
  line2?: string
  address?: string  // This is what we need for the database
  addressLine2?: string
  city: string
  state: string
  postal_code: string  // This is what the form sends
  zipcode?: string  // This is what we need for the database
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
  // Custom card details
  customImageUrl?: string
  // Cart items
  cartItems?: any[]
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

    // Calculate base amount ($9.00 in cents)
    const baseAmountCents = 900
    
    // For crypto payments, we only charge the base amount + tax (no shipping cost)
    const totalBeforeTaxCents = baseAmountCents // Product only (no shipping for crypto)

    // Get tax rate from TaxJar API (more accurate than Stripe Tax)
    let taxRate = 0
    let taxAmountCents = 0
    
    console.log('🧾 TaxJar Tax Calculation Details:')
    console.log('   Base Amount: $' + (baseAmountCents / 100).toFixed(2))
    console.log('   Total Before Tax: $' + (totalBeforeTaxCents / 100).toFixed(2))
    console.log('   Country: ' + shippingAddress.country)
    console.log('   State: ' + shippingAddress.state)
    console.log('   City: ' + shippingAddress.city)
    console.log('   Zipcode: ' + zipcode)
    
    try {
      console.log('   Calling TaxJar API...')
      
      // Use TaxJar API for accurate tax calculation (no shipping for crypto payments)
      const taxCalculation = await taxjar.taxForOrder({
        from_country: 'US',
        from_zip: '89108',
        from_state: 'NV',
        from_city: 'Las Vegas',
        to_country: shippingAddress.country,
        to_zip: zipcode,
        to_state: shippingAddress.state,
        to_city: shippingAddress.city,
        to_street: address,
        amount: totalBeforeTaxCents / 100, // Convert cents to dollars (product only)
        shipping: 0, // No shipping cost for crypto payments
        line_items: [
          {
            id: 'card-001',
            quantity: 1,
            unit_price: baseAmountCents / 100, // Convert cents to dollars
            product_tax_code: '31000' // General merchandise
          }
        ]
      })

      console.log('   TaxJar Response:', {
        rate: taxCalculation.tax.rate,
        amount_to_collect: taxCalculation.tax.amount_to_collect,
        taxable_amount: taxCalculation.tax.taxable_amount,
        freight_taxable: taxCalculation.tax.freight_taxable,
        full_response: JSON.stringify(taxCalculation, null, 2)
      })
      
      // Log detailed tax breakdown
      if (taxCalculation.tax.breakdown) {
        console.log('   📊 TaxJar Breakdown:', {
          shipping_tax: taxCalculation.tax.breakdown.shipping?.tax_collectable,
          line_items_tax: taxCalculation.tax.breakdown.line_items?.[0]?.tax_collectable,
          combined_tax_rate: taxCalculation.tax.breakdown.combined_tax_rate
        })
      }

      // Calculate tax rate and amount
      if (taxCalculation.tax.amount_to_collect > 0) {
        taxRate = taxCalculation.tax.rate * 100 // Convert to percentage
        taxAmountCents = Math.round(taxCalculation.tax.amount_to_collect * 100) // Convert to cents
        
        console.log('   ✅ TaxJar Tax Calculated:')
        console.log('      Tax Amount: $' + (taxAmountCents / 100).toFixed(2))
        console.log('      Tax Rate: ' + taxRate.toFixed(2) + '%')
        console.log('      Freight Taxable: ' + taxCalculation.tax.freight_taxable)
      } else {
        console.log('   ℹ️ No tax calculated (amount: 0)')
      }
    } catch (taxError) {
      console.warn('   ⚠️ TaxJar API failed:', {
        error: taxError instanceof Error ? taxError.message : 'Unknown error',
        response: taxError instanceof Error && 'response' in taxError ? taxError.response : undefined,
        stack: taxError instanceof Error ? taxError.stack : undefined
      })
      
      // Try fallback to Stripe Tax if TaxJar fails
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
          taxRate = (stripeTaxCalculation.tax_amount_exclusive / totalBeforeTaxCents) * 100
          taxAmountCents = Math.round(stripeTaxCalculation.tax_amount_exclusive)
          console.log('   ✅ Stripe Tax Fallback Calculated:')
          console.log('      Tax Amount: $' + (taxAmountCents / 100).toFixed(2))
          console.log('      Tax Rate: ' + taxRate.toFixed(2) + '%')
        }
      } catch (stripeTaxError) {
        console.warn('   ⚠️ Stripe Tax fallback also failed:', stripeTaxError)
      }
    }
    
    const totalAmountCents = totalBeforeTaxCents + taxAmountCents // Product + Tax (no shipping for crypto)
    console.log('   💰 Final Amounts:')
    console.log('      Base: $' + (baseAmountCents / 100).toFixed(2))
    console.log('      Shipping: $0.00 (not included in crypto payments)')
    console.log('      Tax: $' + (taxAmountCents / 100).toFixed(2))
    console.log('      Total: $' + (totalAmountCents / 100).toFixed(2))
    console.log('   📊 Database Values:')
    console.log('      amount_cents: ' + totalAmountCents)
    console.log('      base_amount_cents: ' + totalBeforeTaxCents)
    console.log('      tax_amount_cents: ' + taxAmountCents)
    console.log('      tax_rate_percentage: ' + taxRate)

    // Generate unique transaction ID
    const transactionId = `crypto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Generate order ID (matching the format from your image)
    const orderId = `923${String(Date.now()).slice(-3)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`

    // Save crypto payment record to database in exact format from your image
    const { data: cryptoPayment, error: dbError } = await admin
      .from('crypto_payments')
      .insert({
        transaction_id: transactionId,
        buyer_id: buyerId,
        listing_id: listingId || null,
        amount_cents: totalAmountCents, // Total: Product + Tax (no shipping for crypto)
        base_amount_cents: totalBeforeTaxCents, // Product only (before tax)
        tax_amount_cents: taxAmountCents,
        tax_rate_percentage: taxRate,
        currency: 'USD',
        status: 'pending',
        receiving_address: CRYPTO_RECEIVING_ADDRESS,
        
        // EXACT COLUMNS FROM YOUR IMAGE:
        company: shippingAddress.company || null,
        address: address,
        address_line_2: addressLine2 || null,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipcode: zipcode,
        country: shippingAddress.country,
        order_id: orderId,
        order_items: orderItems,
        
        // Additional order details
        quantity: quantity,
        include_display_case: includeDisplayCase,
        display_case_quantity: displayCaseQuantity,
        card_finish: cardFinish,
        
        // Package dimensions (to be filled later by staff)
        pounds: null,
        length: null,
        width: null,
        height: null,
        
        metadata: {
          payment_method: 'crypto',
          tax_calculation_source: 'taxjar_api',
          // Include order-specific metadata
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

    console.log('✅ Payment saved to database:', {
      id: cryptoPayment.id,
      transaction_id: cryptoPayment.transaction_id,
      amount_cents: cryptoPayment.amount_cents,
      base_amount_cents: cryptoPayment.base_amount_cents,
      tax_amount_cents: cryptoPayment.tax_amount_cents,
      tax_rate_percentage: cryptoPayment.tax_rate_percentage,
      status: cryptoPayment.status
    })

    // Return payment details for frontend
    return NextResponse.json({
      success: true,
      transactionId,
      amount: totalAmountCents, // Total: Product + Shipping + Tax
      baseAmount: baseAmountCents, // Product only
      shippingAmount: 0, // No shipping for crypto payments
      taxAmount: taxAmountCents,
      taxRate: taxRate,
      receivingAddress: CRYPTO_RECEIVING_ADDRESS,
      paymentId: cryptoPayment.id,
      message: `Please send $${(totalAmountCents / 100).toFixed(2)} USD worth of crypto to the address below.`,
    })

  } catch (error) {
    console.error('Crypto payment creation error:', error)
    return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 })
  }
}

