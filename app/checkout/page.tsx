'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ShieldCheck, Lock, CreditCard, Loader2, ShoppingCart, AlertCircle } from 'lucide-react'
import { ShippingAddressForm, type ShippingAddress } from '@/components/shipping-address-form'
import { csrfFetch } from '@/lib/csrf-client'

export const dynamic = 'force-dynamic' // avoid prerender/export errors for this page

/** Load Stripe for the (optional) connected account */
function useStripeLoader(acct: string | null) {
  return useMemo<Promise<Stripe | null>>(
    () => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, acct ? { stripeAccount: acct } : undefined),
    [acct]
  )
}

// Custom card order types
interface CustomCardOrder {
  quantity: number
  includeDisplayCase: boolean
  displayCaseQuantity: number
  customImageUrl: string
  cardFinish: string
}

function CheckoutForm({ paymentIntentId }: { paymentIntentId: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setBusy(true)

    const { error: submitErr } = await elements.submit()
    if (submitErr) {
      toast({ title: 'Input error', description: submitErr.message, variant: 'destructive' })
      setBusy(false)
      return
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${location.origin}/payment-success?payment_intent=${paymentIntentId}`,
      },
      redirect: 'if_required',
    })

    if (error) {
      toast({ title: 'Payment failed', description: error.message, variant: 'destructive' })
    } else if (paymentIntent?.status === 'succeeded') {
      router.push(`/payment-success?payment_intent=${paymentIntent.id}`)
    }
    setBusy(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-cyber-cyan/30 bg-cyber-dark/60 p-4 backdrop-blur-sm">
        <PaymentElement />
      </div>

      <Button disabled={!stripe || busy} className="cyber-button w-full text-base py-5 tracking-wider">
        {busy ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing…
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-5 w-5" />
            Complete Payment
          </>
        )}
      </Button>

      <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
        <ShieldCheck className="h-4 w-4 text-cyber-green" />
        <span>Secure checkout</span>
        <span className="text-gray-600">•</span>
        <Lock className="h-4 w-4 text-cyber-cyan" />
        <span>PCI-compliant • 256-bit TLS</span>
      </div>
    </form>
  )
}

/** Inner component that uses useSearchParams — wrapped in Suspense by the page */
function CheckoutInner() {
  const [clientSecret, setClientSecret] = useState('')
  const [paymentIntentId, setPaymentIntentId] = useState('')
  const [stripeAcct, setStripeAcct] = useState<string | null>(null)
  const [isCustomCard, setIsCustomCard] = useState(false)
  const [customCardOrder, setCustomCardOrder] = useState<CustomCardOrder | null>(null)
  const [currentStep, setCurrentStep] = useState<'shipping' | 'payment'>('shipping')
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const params = useSearchParams() // <-- Suspense boundary required
  const listingId = params.get('listingId')
  
  // Custom card parameters
  const quantity = params.get('quantity')
  const includeDisplayCase = params.get('includeDisplayCase') === 'true'
  const displayCaseQuantity = parseInt(params.get('displayCaseQuantity') || '1')
  const customImageUrl = params.get('customImageUrl')
  const cardFinish = params.get('cardFinish') || 'glossy'

  const stripePromise = useStripeLoader(stripeAcct)

  // Determine if this is a custom card order
  useEffect(() => {
    if (customImageUrl && quantity) {
      setIsCustomCard(true)
      setCustomCardOrder({
        quantity: parseInt(quantity),
        includeDisplayCase,
        displayCaseQuantity,
        customImageUrl,
        cardFinish
      })
    }
  }, [customImageUrl, quantity, includeDisplayCase, displayCaseQuantity, cardFinish])

  useEffect(() => {
    if (isCustomCard) {
      // For custom cards, we'll handle the flow differently
      return
    }
    
    if (!listingId) return
    ;(async () => {
      try {
        const res = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId }),
        })
        if (!res.ok) {
          console.error('[create-payment-intent]', await res.text())
          return
        }
        const { clientSecret, paymentIntentId, stripeAccount } = await res.json()
        setClientSecret(clientSecret)
        setPaymentIntentId(paymentIntentId)
        setStripeAcct(stripeAccount ?? null) // null -> platform, acct_... -> connected account
      } catch (e) {
        console.error('[checkout] failed to create PI', e)
      }
    })()
  }, [listingId, isCustomCard])

  // Handle custom card shipping submission
  const handleShippingSubmit = async (address: ShippingAddress) => {
    if (!customCardOrder) return
    
    setIsProcessing(true)
    
    try {
      console.log('💳 Creating Stripe checkout session for custom card...', {
        quantity: customCardOrder.quantity,
        endpoint: '/api/create-checkout-session',
        payload: {
          quantity: customCardOrder.quantity,
          includeDisplayCase: customCardOrder.includeDisplayCase,
          displayCaseQuantity: customCardOrder.displayCaseQuantity,
          shippingAddress: address,
          isCustomCard: true,
          customImageUrl: customCardOrder.customImageUrl,
          cardFinish: customCardOrder.cardFinish
        }
      })
      
      const response = await csrfFetch('/api/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ 
          quantity: customCardOrder.quantity,
          includeDisplayCase: customCardOrder.includeDisplayCase,
          displayCaseQuantity: customCardOrder.displayCaseQuantity,
          shippingAddress: address,
          isCustomCard: true,
          customImageUrl: customCardOrder.customImageUrl,
          cardFinish: customCardOrder.cardFinish
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Checkout session creation failed:', errorData)
        
        let userMessage = 'An unexpected error occurred. Please try again.'
        
        switch (errorData.code) {
          case 'INSUFFICIENT_INVENTORY':
            userMessage = 'Insufficient inventory available'
            break
          case 'CSRF_INVALID':
            userMessage = 'Security validation failed. Please refresh the page and try again.'
            break
          case 'INVALID_QUANTITY':
            userMessage = 'Invalid quantity selected. Please choose a quantity between 1 and 100.'
            break
          case 'STRIPE_ERROR':
            userMessage = 'Payment processing error. Please try again.'
            break
          default:
            userMessage = errorData.error || 'An unexpected error occurred. Please try again.'
        }
        
        toast({ title: 'Checkout Error', description: userMessage, variant: 'destructive' })
        return
      }

      const data = await response.json()
      
      console.log('✅ Checkout session created successfully:', {
        sessionId: data.id,
        hasUrl: !!data.url
      })
      
      // Redirect to Stripe Checkout
      if (data.url) {
        console.log('🔄 Redirecting to Stripe Checkout...', {
          url: data.url,
          sessionId: data.id
        })
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received from payment processor')
      }
    } catch (error) {
      console.error('💥 Custom card checkout failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to start checkout. Please try again.'
      toast({ title: 'Checkout Error', description: errorMessage, variant: 'destructive' })
    } finally {
      setIsProcessing(false)
    }
  }

  const options =
    clientSecret
      ? {
          clientSecret,
          appearance: {
            theme: 'night' as const,
            variables: {
              colorPrimary: '#00F7FF',
              colorBackground: '#0B0F13',
              colorText: '#E5E7EB',
              colorDanger: '#FF4D6D',
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              borderRadius: '12px',
            },
            rules: {
              '.Input': {
                borderColor: 'rgba(0, 255, 234, 0.35)',
                boxShadow: '0 0 0 0.5px rgba(0, 255, 234, 0.35)',
                backgroundColor: 'rgba(20, 28, 38, 0.6)',
              },
              '.Input:focus': {
                boxShadow: '0 0 0 1.5px rgba(0, 255, 234, 0.65)',
              },
              '.Tab, .StepperItem': {
                borderColor: 'rgba(0, 255, 234, 0.25)',
              },
            },
          },
        }
      : undefined

  // Render custom card shipping form
  if (isCustomCard && currentStep === 'shipping') {
    return (
      <Card className="relative overflow-hidden border border-cyber-cyan/30 bg-cyber-dark/50 backdrop-blur-md">
        <div className="pointer-events-none absolute -inset-px rounded-xl ring-1 ring-cyber-cyan/20" />
        <CardHeader className="border-b border-cyber-cyan/20">
          <CardTitle className="flex items-center justify-center gap-2 text-center text-2xl tracking-wider text-cyber-cyan">
            <ShoppingCart className="h-6 w-6 text-cyber-cyan" />
            Custom Card Order
          </CardTitle>
          <div className="text-center text-sm text-gray-400">
            Quantity: {customCardOrder?.quantity} • Finish: {customCardOrder?.cardFinish}
          </div>
        </CardHeader>

        <CardContent className="p-6 md:p-8">
          <div className="max-w-md mx-auto">
            <ShippingAddressForm
              onSubmit={handleShippingSubmit}
              onBack={() => window.history.back()}
              isSubmitting={isProcessing}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render marketplace payment form
  return (
    <Card className="relative overflow-hidden border border-cyber-cyan/30 bg-cyber-dark/50 backdrop-blur-md">
      <div className="pointer-events-none absolute -inset-px rounded-xl ring-1 ring-cyber-cyan/20" />
      <CardHeader className="border-b border-cyber-cyan/20">
        <CardTitle className="flex items-center justify-center gap-2 text-center text-2xl tracking-wider text-cyber-cyan">
          <CreditCard className="h-6 w-6 text-cyber-cyan" />
          Complete Your Purchase
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 md:p-8">
        {clientSecret && options ? (
          <Elements stripe={stripePromise} options={options} key={clientSecret}>
            <CheckoutForm paymentIntentId={paymentIntentId} />
          </Elements>
        ) : (
          <div className="flex items-center justify-center py-16 text-cyber-cyan/80">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading payment form…
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function CheckoutPage() {
  return (
    <div className="relative min-h-screen bg-cyber-black text-white">
      <div className="pointer-events-none fixed inset-0 cyber-grid opacity-10" />
      <div className="pointer-events-none fixed inset-0 scanlines opacity-15" />

      <div className="mx-auto max-w-3xl px-4 py-20">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="tracking-widest text-3xl font-bold text-white">
            Cardify Checkout
          </h1>
          <div className="rounded-full border border-cyber-cyan/40 bg-cyber-dark/60 px-3 py-1 text-xs text-cyber-cyan">
            Live • Encrypted
          </div>
        </div>

        {/* Wrap the part that uses useSearchParams in Suspense */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-24 text-cyber-cyan/80">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Preparing checkout…
            </div>
          }
        >
          <CheckoutInner />
        </Suspense>

        <p className="mt-6 text-center text-xs text-gray-400">
          By completing this purchase, you agree to our{' '}
          <a className="text-cyber-cyan underline hover:text-cyber-pink" href="/terms" target="_blank" rel="noreferrer">
            Terms
          </a>{' '}
          and{' '}
          <a
            className="text-cyber-cyan underline hover:text-cyber-pink"
            href="/privacy"
            target="_blank"
            rel="noreferrer"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  )
}
