"use client"

import React, { useState, useMemo, useEffect } from "react"
import { ArrowLeft, Check, Wallet, Loader2 } from "lucide-react"
import { allCountries } from "country-region-data"
import { usePrivy } from '@privy-io/react-auth'
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { createPublicClient, http, parseAbi } from "viem"
import { sepolia } from "viem/chains"
import { useToast } from '@/hooks/use-toast'
import { WalletButton } from '@/components/WalletConnect'

/** ---------- Config: Chainlink ETH/USD (Sepolia) ---------- */
// Official Chainlink ETH/USD data feed (Sepolia)
const CL_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306"
/** Optional RPC override (public ok). Set NEXT_PUBLIC_ETHEREUM_SEPOLIA_RPC in env. */
const ETH_SEPOLIA_RPC = process.env.NEXT_PUBLIC_ETHEREUM_SEPOLIA_RPC || undefined

const clAbi = parseAbi([
  "function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)",
  "function decimals() view returns (uint8)"
])

const clClient = createPublicClient({
  chain: sepolia,
  transport: http(ETH_SEPOLIA_RPC)
})

/** Read price from Chainlink on-chain feed (Sepolia). Returns a JS number in USD. */
async function getEthUsdFromChainlink(): Promise<number> {
  const [ , answer ] = await clClient.readContract({
    address: CL_ETH_USD_SEPOLIA as `0x${string}`,
    abi: clAbi,
    functionName: "latestRoundData"
  }) as unknown as [bigint, bigint, bigint, bigint, bigint] // keep tuple shape
  const decimals = await clClient.readContract({
    address: CL_ETH_USD_SEPOLIA as `0x${string}`,
    abi: clAbi,
    functionName: "decimals"
  }) as unknown as number
  // answer is int256 with `decimals` places
  return Number(answer) / 10 ** Number(decimals)
}

/** ---------- Shipping countries list (unchanged) ---------- */
const SHIPPING_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LV', name: 'Latvia' },
  { code: 'EE', name: 'Estonia' },
  { code: 'GR', name: 'Greece' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'MT', name: 'Malta' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'KR', name: 'South Korea' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Philippines' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'IN', name: 'India' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'TR', name: 'Turkey' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Peru' },
  { code: 'CO', name: 'Colombia' },
].sort((a, b) => a.name.localeCompare(b.name))

export interface ShippingAddress {
  email: string
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postal_code: string
  country: string
}

interface StripeStyledShippingFormProps {
  onSubmit: (address: ShippingAddress, paymentMethod: 'stripe' | 'crypto') => void
  onBack: () => void
  isSubmitting?: boolean
  subtotal?: number
  orderType?: 'custom-card' | 'limited-edition' | 'marketplace' | 'cart'
  orderDetails?: {
    customImageUrl?: string
    cardFinish?: string
    includeDisplayCase?: boolean
    displayCaseQuantity?: number
    listingId?: string
    cartItems?: any[]
  }
}

export function StripeStyledShippingForm({ onSubmit, onBack, isSubmitting = false, subtotal, orderType, orderDetails }: StripeStyledShippingFormProps) {
  const [formData, setFormData] = useState<ShippingAddress>({
    email: '',
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({})
  const [keepUpdated, setKeepUpdated] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'crypto' | null>(null)

  // Crypto state
  const [cryptoPaymentData, setCryptoPaymentData] = useState<any>(null)
  const [isProcessingCrypto, setIsProcessingCrypto] = useState(false)
  const [cryptoPaymentStatus, setCryptoPaymentStatus] = useState<'pending' | 'processing' | 'submitted' | 'complete' | 'failed'>('pending')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined)

  // Chainlink quote state
  const [quotedEth, setQuotedEth] = useState<string>('0.000000')
  const [quotedUsd, setQuotedUsd] = useState<number>(0)
  const [quotedEthUsdPrice, setQuotedEthUsdPrice] = useState<number>(3000)
  const [quoteSource, setQuoteSource] = useState<'chainlink' | 'coingecko' | 'fallback'>('fallback')

  // Wallet
  const { ready } = usePrivy()
  const { address, isConnected } = useAccount()
  const { toast } = useToast()

  const { data: sendHash, isPending: isSendPending, sendTransaction, error: txError } = useSendTransaction()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: sendHash })

  useEffect(() => {
    if (isConfirmed && cryptoPaymentData && sendHash) {
      setTxHash(sendHash)
      setCryptoPaymentStatus('complete')
      // Mark complete in DB
      updatePaymentStatus(cryptoPaymentData.transactionId, 'complete', sendHash)
      toast({ title: "Payment Complete", description: "Your crypto payment has been confirmed!" })
    }
  }, [isConfirmed, cryptoPaymentData, sendHash, toast])

  useEffect(() => {
    if (txError && cryptoPaymentData) {
      setCryptoPaymentStatus('failed')
      updatePaymentStatus(cryptoPaymentData.transactionId, 'failed')
      toast({ title: "Transaction Failed", description: txError.message || "Failed to send transaction", variant: "destructive" })
    }
  }, [txError, cryptoPaymentData, toast])

  // Get regions for selected country
  const regions = useMemo(() => {
    if (!formData.country) return []
    if (Array.isArray(allCountries)) {
      const firstItem = allCountries[0]
      if (Array.isArray(firstItem)) {
        const countryData = allCountries.find((c: [string, string, Array<[string, string]>]) => c[1] === formData.country)
        if (countryData && countryData[2]) {
          return countryData[2].map((region: [string, string]) => ({ name: region[0], shortCode: region[1] }))
        }
      } else {
        // @ts-ignore
        const countryData = allCountries.find((c: any) => c.countryShortCode === formData.country) as any
        return countryData?.regions || []
      }
    }
    return []
  }, [formData.country])

  const handleInputChange = (field: keyof ShippingAddress, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'country' && value !== prev.country) updated.state = ''
      return updated
    })
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ShippingAddress, string>> = {}
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Please enter a valid email'
    if (!formData.name.trim()) newErrors.name = 'Full name is required'
    if (!formData.line1.trim()) newErrors.line1 = 'Address is required'
    if (!formData.city.trim()) newErrors.city = 'City is required'
    if (regions.length > 0 && !formData.state.trim()) newErrors.state = 'State/Province is required'
    if (!formData.postal_code.trim()) newErrors.postal_code = 'Postal/ZIP code is required'
    if (!formData.country) newErrors.country = 'Country is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getShippingPrice = () => {
    if (!formData.country) return null
    if (formData.country === 'US') return 4.99
    if (formData.country === 'CA') return 11.99
    return 16.99
  }

  const shippingPrice = getShippingPrice()
  const total = subtotal !== undefined && shippingPrice !== null ? subtotal + (shippingPrice || 0) : shippingPrice

  /** Quote ETH using Chainlink on-chain first, fallback to CoinGecko, then hardcoded */
  const quoteEth = async (usdCents: number) => {
    const usd = usdCents / 100
    try {
      const price = await getEthUsdFromChainlink()
      setQuotedEthUsdPrice(price)
      setQuoteSource('chainlink')
      setQuotedUsd(usd)
      setQuotedEth((usd / price).toFixed(6))
      return
    } catch (e) {
      // Fallback to CoinGecko
      try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
        const d = await r.json()
        const price = d?.ethereum?.usd ?? 3000
        setQuotedEthUsdPrice(price)
        setQuoteSource('coingecko')
        setQuotedUsd(usd)
        setQuotedEth((usd / price).toFixed(6))
        return
      } catch {
        setQuotedEthUsdPrice(3000)
        setQuoteSource('fallback')
        setQuotedUsd(usd)
        setQuotedEth((usd / 3000).toFixed(6))
      }
    }
  }

  // Backend status updater
  const updatePaymentStatus = async (transactionId: string, status: string, transactionHash?: string) => {
    try {
      const res = await fetch('/api/crypto-payment/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          status,
          transactionHash,
          ...(status === 'complete' && { confirmedAt: new Date().toISOString() })
        }),
      })
      if (!res.ok) throw new Error('Failed to update payment status')
    } catch (err) {
      console.error('Failed to update payment status:', err)
    }
  }

  // Create payment → then quote ETH once
  const handleCreateAndSendPayment = async () => {
    setIsProcessingCrypto(true)
    try {
      const response = await fetch('/api/crypto-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddress: formData,
          orderItems:
            orderType === 'custom-card' ? 'Custom Card' :
            orderType === 'limited-edition' ? 'Limited Edition Card' :
            orderType === 'marketplace' ? 'Marketplace Card' : 'Cart Items',
          ...(orderType === 'custom-card' && orderDetails && {
            customImageUrl: orderDetails.customImageUrl,
            cardFinish: orderDetails.cardFinish,
            includeDisplayCase: orderDetails.includeDisplayCase,
            displayCaseQuantity: orderDetails.displayCaseQuantity,
          }),
          ...(orderType === 'marketplace' && orderDetails && { listingId: orderDetails.listingId }),
          ...(orderType === 'cart' && orderDetails && { cartItems: orderDetails.cartItems }),
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create crypto payment')
      }
      const data = await response.json()
      setCryptoPaymentData(data)
      setCryptoPaymentStatus('pending')

      // Quote ETH from Chainlink (or fallback) once and cache
      await quoteEth(data.amount)
    } catch (error) {
      console.error('Crypto payment creation failed:', error)
      setCryptoPaymentStatus('failed')
      toast({ title: "Payment Failed", description: error instanceof Error ? error.message : "Failed to create payment", variant: "destructive" })
    } finally {
      setIsProcessingCrypto(false)
    }
  }

  const createCryptoPayment = async () => {
    if (!validateForm()) {
      toast({ title: "Form Validation Error", description: "Please fill in all required fields", variant: "destructive" })
      return
    }
    if (isConnected && !cryptoPaymentData) {
      await handleCreateAndSendPayment()
    } else if (!isConnected) {
      toast({ title: "Wallet Not Connected", description: "Please connect your wallet first", variant: "destructive" })
    }
  }

  const handleSendCryptoPayment = async () => {
    if (!cryptoPaymentData) return
    if (!isConnected) {
      toast({ title: "Wallet Not Connected", description: "Please connect your wallet first", variant: "destructive" })
      return
    }

    setIsProcessingCrypto(true)
    setCryptoPaymentStatus('processing')

    try {
      await sendTransaction({
        to: cryptoPaymentData.receivingAddress as `0x${string}`,
        value: parseEther(quotedEth), // exact same quoted amount shown in UI
      })
      setCryptoPaymentStatus('submitted')
      toast({ title: "Transaction Sent", description: "Submitted to the network. Waiting for confirmation..." })
    } catch (error) {
      console.error('Payment error:', error)
      setCryptoPaymentStatus('failed')
      await updatePaymentStatus(cryptoPaymentData.transactionId, 'failed')
      toast({ title: "Payment Failed", description: error instanceof Error ? error.message : "Failed to send payment", variant: "destructive" })
    } finally {
      setIsProcessingCrypto(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPaymentMethod) {
      alert('Please select a payment method')
      return
    }
    if (selectedPaymentMethod === 'crypto') {
      if (cryptoPaymentData && isConnected) {
        handleSendCryptoPayment()
      } else {
        createCryptoPayment()
      }
      return
    }
    if (validateForm()) onSubmit(formData, selectedPaymentMethod)
  }

  useEffect(() => {
    console.log('🔍 Wallet state:', { isConnected, address, hasPaymentData: !!cryptoPaymentData })
  }, [isConnected, address, cryptoPaymentData])

  return (
    <div className="p-6 stripe-styled-form-container">
      {/* --- styles omitted for brevity, keep your existing <style jsx global> block --- */}
      {/* ... paste your existing long <style jsx global> exactly here ... */}

      <form onSubmit={handleSubmit} className="stripe-checkout-form">
        <div className="mb-6">
          <h2 className="stripe-section-title">Shipping information</h2>
        </div>

        {/* --- inputs (unchanged from your version) --- */}
        {/* email, newsletter, address, country, line1, line2, city, postal, state/select or text fallback */}
        {/* show state select OR text when regions empty */}
        {/* ... keep your existing input block exactly as before ... */}

        {/* Totals box: render when subtotal is provided, even if 0 */}
        {subtotal !== undefined && shippingPrice !== null && (
          <div className="stripe-summary-box">
            <div className="stripe-summary-row">
              <span className="stripe-summary-label">Subtotal</span>
              <span className="stripe-summary-value">${subtotal.toFixed(2)}</span>
            </div>
            <div className="stripe-summary-row">
              <span className="stripe-summary-label">Shipping</span>
              <span className="stripe-summary-value">${shippingPrice.toFixed(2)}</span>
            </div>
            <div className="stripe-summary-row">
              <span className="stripe-summary-label">Total</span>
              <span className="stripe-summary-value">${total?.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="stripe-divider"></div>

        {/* Payment method selection (unchanged visuals) */}
        {/* ... keep your radio UI ... */}

        {/* Crypto section */}
        {selectedPaymentMethod === 'crypto' && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Complete Crypto Payment</h3>

            {!cryptoPaymentData ? (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">Connect your wallet to proceed with crypto payment</p>
                {!isConnected ? (
                  <div className="w-full">
                    {ready ? (
                      <WalletButton />
                    ) : (
                      <button type="button" disabled className="w-full bg-gray-300 border-2 border-gray-400 text-gray-500 px-4 py-2 rounded-lg font-medium cursor-not-allowed">
                        <Wallet className="w-4 h-4 mr-2 inline" />
                        Loading...
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-green-800">Wallet Connected</span>
                      </div>
                      <span className="text-xs text-gray-600 font-mono">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Wallet connected! Click "Create Crypto Payment" to continue.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Payment details */}
                <div className="bg-white p-4 rounded border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Base Amount:</span>
                    <span className="font-medium">${(cryptoPaymentData.baseAmount / 100).toFixed(2)}</span>
                  </div>
                  {cryptoPaymentData.taxAmount > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Tax ({cryptoPaymentData.taxRate.toFixed(2)}%):</span>
                      <span className="text-sm font-medium">${(cryptoPaymentData.taxAmount / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-2 border-t pt-2">
                    <span className="font-bold">Total Amount:</span>
                    <span className="font-bold text-lg">${(cryptoPaymentData.amount / 100).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Network:</span>
                    <span className="text-sm font-mono">Base Sepolia</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">ETH Amount:</span>
                    <span className="text-sm font-mono font-bold">{quotedEth} ETH</span>
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-2">
                    Price source:&nbsp;
                    {quoteSource === 'chainlink' && <>Chainlink on-chain (Sepolia) @ ${quotedEthUsdPrice.toFixed(2)}</>}
                    {quoteSource === 'coingecko' && <>CoinGecko @ ${quotedEthUsdPrice.toFixed(2)}</>}
                    {quoteSource === 'fallback' && <>Fixed ${quotedEthUsdPrice.toFixed(2)}</>}
                  </div>
                </div>

                {/* Wallet connected / status */}
                {!isConnected ? (
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">Connect your wallet to send payment</p>
                    <div className="w-full">
                      {ready ? (
                        <WalletButton />
                      ) : (
                        <button type="button" disabled className="w-full bg-gray-300 border-2 border-gray-400 text-gray-500 px-4 py-2 rounded-lg font-medium cursor-not-allowed">
                          <Wallet className="w-4 h-4 mr-2 inline" />
                          Loading...
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Click "Connect Wallet" first, then "Create Crypto Payment"</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-green-800">Wallet Connected</span>
                      </div>
                      <span className="text-xs text-gray-600 font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                    </div>

                    {cryptoPaymentStatus === 'processing' && (
                      <div className="flex items-center justify-center p-3 bg-blue-50 rounded-lg">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm text-blue-800">Processing payment...</span>
                      </div>
                    )}

                    {cryptoPaymentStatus === 'submitted' && (
                      <div className="flex items-center justify-center p-3 bg-yellow-50 rounded-lg">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-yellow-600" />
                        <span className="text-sm text-yellow-800">Waiting for confirmation...</span>
                      </div>
                    )}

                    {cryptoPaymentStatus === 'complete' && (
                      <div className="flex items-center justify-center p-3 bg-green-50 rounded-lg">
                        <Check className="mr-2 h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800">Payment confirmed!</span>
                      </div>
                    )}

                    {cryptoPaymentStatus === 'failed' && (
                      <div className="flex items-center justify-center p-3 bg-red-50 rounded-lg">
                        <span className="text-sm text-red-800">Payment failed. Please try again.</span>
                      </div>
                    )}

                    {txHash && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Transaction Hash:</p>
                        <p className="text-xs font-mono text-gray-600 break-all">{txHash}</p>
                      </div>
                    )}

                    {cryptoPaymentStatus === 'pending' && (
                      <div className="text-center py-2">
                        <p className="text-gray-600">Payment created! Click “Send Transaction”.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="stripe-divider"></div>

        <div className="flex gap-3">
          <button type="button" onClick={onBack} disabled={isSubmitting} className="stripe-button stripe-button-secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>

          {selectedPaymentMethod === 'crypto' && cryptoPaymentStatus === 'complete' ? (
            <button type="button" disabled className="stripe-button stripe-button-primary bg-green-600 hover:bg-green-700 cursor-not-allowed">
              <Check className="w-4 h-4 mr-2" />
              Payment Complete
            </button>
          ) : (
            <button type="submit" disabled={isSubmitting || isProcessingCrypto || isSendPending || isConfirming} className="stripe-button stripe-button-primary">
              {isSubmitting || isProcessingCrypto
                ? 'Processing...'
                : selectedPaymentMethod === 'crypto'
                  ? (isConnected ? (cryptoPaymentData ? 'Send Transaction' : 'Create Crypto Payment') : 'Connect Wallet First')
                  : 'Continue to payment'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
