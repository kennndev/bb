"use client"

import React, { useState, useMemo, useEffect } from "react"
import { ArrowLeft, Check, Wallet, Loader2 } from "lucide-react"
import { allCountries } from "country-region-data"
import { usePrivy } from '@privy-io/react-auth'
import { useAccount, useSendTransaction } from 'wagmi'
import { parseEther } from 'viem'
import { useToast } from '@/hooks/use-toast'
import { WalletButton } from '@/components/WalletConnect'

// List of countries we ship to
const SHIPPING_COUNTRIES = [
  // North America
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
  
  // Europe
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
  
  // Asia-Pacific
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
  
  // Middle East & Africa
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'TR', name: 'Turkey' },
  { code: 'ZA', name: 'South Africa' },
  
  // Americas (South & Central)
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
}

export function StripeStyledShippingForm({ onSubmit, onBack, isSubmitting = false, subtotal }: StripeStyledShippingFormProps) {
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
  
  // Wallet connection state
  const [cryptoPaymentData, setCryptoPaymentData] = useState<any>(null)
  const [isProcessingCrypto, setIsProcessingCrypto] = useState(false)
  const [cryptoPaymentStatus, setCryptoPaymentStatus] = useState<'pending' | 'processing' | 'submitted' | 'complete' | 'failed'>('pending')
  const [txHash, setTxHash] = useState('')
  
  // Wallet hooks
  const { ready, authenticated, login } = usePrivy()
  const { address, isConnected } = useAccount()
  const { sendTransaction, isPending, isSuccess, data: txData, error: txError } = useSendTransaction()
  const { toast } = useToast()

  // Monitor wallet connection status (simplified like WalletButton)
  useEffect(() => {
    console.log('🔍 Wallet state changed:', { 
      ready, 
      isConnected, 
      address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'none',
      hasPaymentData: !!cryptoPaymentData 
    })
    if (isConnected && address) {
      console.log('✅ Wallet connected:', address)
    } else if (!isConnected) {
      console.log('❌ Wallet disconnected')
    }
  }, [ready, isConnected, address, cryptoPaymentData])

  // Get regions for the selected country
  const regions = useMemo(() => {
    if (!formData.country) return []
    
    if (Array.isArray(allCountries)) {
      const firstItem = allCountries[0]
      if (Array.isArray(firstItem)) {
        const countryData = allCountries.find((c: [string, string, Array<[string, string]>]) => c[1] === formData.country)
        if (countryData && countryData[2]) {
          return countryData[2].map((region: [string, string]) => ({
            name: region[0],
            shortCode: region[1]
          }))
        }
      } else {
        // @ts-ignore - country-region-data types are complex
        const countryData = allCountries.find((c: any) => c.countryShortCode === formData.country) as any
        return countryData?.regions || []
      }
    }
    
    return []
  }, [formData.country])

  const handleInputChange = (field: keyof ShippingAddress, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      if (field === 'country' && value !== prev.country) {
        updated.state = ''
      }
      
      return updated
    })
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ShippingAddress, string>> = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required'
    }

    if (!formData.line1.trim()) {
      newErrors.line1 = 'Address is required'
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }

    if (!formData.state.trim() && regions.length > 0) {
      newErrors.state = 'State/Province is required'
    }

    if (!formData.postal_code.trim()) {
      newErrors.postal_code = 'Postal/ZIP code is required'
    }

    if (!formData.country) {
      newErrors.country = 'Country is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('📝 Form submitted, validating...', formData)
    
    if (!selectedPaymentMethod) {
      alert('Please select a payment method')
      return
    }
    
    if (selectedPaymentMethod === 'crypto') {
      // Handle crypto payment flow
      if (cryptoPaymentData && isConnected) {
        // Payment already created, send transaction
        handleSendCryptoPayment()
      } else {
        // Create payment first
        createCryptoPayment()
      }
    } else if (validateForm()) {
      console.log('✅ Form validation passed, calling onSubmit')
      onSubmit(formData, selectedPaymentMethod)
    } else {
      console.log('❌ Form validation failed')
    }
  }

  const getShippingPrice = () => {
    if (!formData.country) return null
    if (formData.country === 'US') return 4.99
    if (formData.country === 'CA') return 11.99
    return 16.99
  }

  const shippingPrice = getShippingPrice()
  const total = subtotal ? subtotal + (shippingPrice || 0) : shippingPrice

  // Get ETH price - real-time for mainnet, fixed for testnet
  const getETHPrice = async (): Promise<number> => {
    // Check if we're on testnet (Base Sepolia)
    const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ID === '84532' || 
                     window.location.hostname === 'localhost'
    
    if (isTestnet) {
      // Base Sepolia testnet - ETH has no real value, using fixed price for testing
      return 3000 // $3000 per ETH for testnet calculations
    }
    
    // Mainnet - get real-time price from Alchemy Prices API
    try {
      const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
      if (!alchemyApiKey) {
        throw new Error('Alchemy API key not configured')
      }
      
      // Use Alchemy Prices API for real-time ETH price
      const response = await fetch(`https://prices-api.alchemy.com/v1/eth/usd`, {
        headers: {
          'Authorization': `Bearer ${alchemyApiKey}`,
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        throw new Error(`Alchemy API error: ${response.status}`)
      }
      
      const data = await response.json()
      return data.price || data.usd || data.ethereum?.usd
      
    } catch (error) {
      console.warn('Failed to fetch ETH price from Alchemy, trying CoinGecko fallback:', error)
      
      // Fallback to CoinGecko if Alchemy fails
      try {
        const coinGeckoResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
        const data = await coinGeckoResponse.json()
        return data.ethereum.usd
      } catch (fallbackError) {
        console.warn('CoinGecko fallback also failed, using hardcoded price:', fallbackError)
        return 3000 // $3000 per ETH as final fallback
      }
    }
  }

  // Crypto payment functions
  
  const updatePaymentStatus = async (transactionId: string, status: string, transactionHash?: string) => {
    try {
      const response = await fetch('/api/crypto-payment/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId,
          status,
          transactionHash,
          ...(status === 'complete' && { confirmedAt: new Date().toISOString() })
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update payment status')
      }

      console.log(`✅ Payment status updated to: ${status}`, transactionHash ? `Hash: ${transactionHash}` : '')
    } catch (error) {
      console.error('❌ Failed to update payment status:', error)
    }
  }

  const createCryptoPayment = async () => {
    if (!validateForm()) {
      toast({
        title: "Form Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    // Only create payment if wallet is connected AND no payment exists yet
    if (isConnected && !cryptoPaymentData) {
      await handleCreateAndSendPayment()
    } else if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive"
      })
    }
  }

  const handleCreateAndSendPayment = async () => {
    setIsProcessingCrypto(true)
    
    try {
      // First create the payment
      const response = await fetch('/api/crypto-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shippingAddress: formData,
          orderItems: 'Custom Card',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create crypto payment')
      }

      const data = await response.json()
      console.log('💳 Crypto Payment Created:', {
        baseAmount: data.baseAmount,
        taxAmount: data.taxAmount,
        taxRate: data.taxRate,
        totalAmount: data.amount,
        receivingAddress: data.receivingAddress
      })
      setCryptoPaymentData(data)
      setCryptoPaymentStatus('pending')
      
      // Don't automatically send - wait for user to click "Send Transaction"
      console.log('✅ Crypto payment created successfully. Ready to send transaction.')
      
    } catch (error) {
      console.error('Crypto payment creation/sending failed:', error)
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to create/send payment",
        variant: "destructive"
      })
      setCryptoPaymentStatus('failed')
    } finally {
      setIsProcessingCrypto(false)
    }
  }

  const handleSendCryptoPayment = async () => {
    console.log('🚀 handleSendCryptoPayment called:', { 
      hasPaymentData: !!cryptoPaymentData, 
      isConnected, 
      address 
    })
    
    if (!cryptoPaymentData) {
      console.error('❌ No payment data available')
      return
    }
    
    if (!isConnected) {
      console.error('❌ Wallet not connected')
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive"
      })
      return
    }

    setIsProcessingCrypto(true)
    setCryptoPaymentStatus('processing')

    try {
      // Get real-time ETH price from Alchemy API
      const ethPrice: number = await getETHPrice()
      const amountInUSD = cryptoPaymentData.amount / 100
      const ethAmount = (amountInUSD / ethPrice).toFixed(6)
      
      console.log(`💸 Payment Details:`)
      console.log(`   Base Amount: $${(cryptoPaymentData.baseAmount / 100).toFixed(2)}`)
      console.log(`   Tax Amount: $${(cryptoPaymentData.taxAmount / 100).toFixed(2)} (${cryptoPaymentData.taxRate.toFixed(1)}%)`)
      console.log(`   Total USD: $${amountInUSD.toFixed(2)}`)
      console.log(`   ETH Price: $${ethPrice}`)
      console.log(`   ETH Amount: ${ethAmount} ETH`)
      console.log(`   Network: Base Sepolia`)
      console.log(`   To Address: ${cryptoPaymentData.receivingAddress}`)
      
      await sendTransaction({
        to: cryptoPaymentData.receivingAddress as `0x${string}`,
        value: parseEther(ethAmount),
      })
      
      console.log('🚀 Transaction sent, waiting for confirmation...')
      setCryptoPaymentStatus('submitted')
      
      toast({
        title: "Transaction Sent",
        description: "Transaction submitted to blockchain, waiting for confirmation...",
        variant: "default"
      })
      
    } catch (error) {
      console.error('Payment error:', error)
      setCryptoPaymentStatus('failed')
      
      // Update status to failed in database
      if (cryptoPaymentData) {
        await updatePaymentStatus(cryptoPaymentData.transactionId, 'failed')
      }
      
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to send payment",
        variant: "destructive"
      })
    } finally {
      setIsProcessingCrypto(false)
    }
  }

  // Monitor transaction status
  React.useEffect(() => {
    if (isSuccess && txData && cryptoPaymentData) {
      const transactionHash = String(txData)
      console.log('✅ Transaction confirmed:', transactionHash)
      setTxHash(transactionHash)
      setCryptoPaymentStatus('complete')
      
      // Update status to complete in database
      updatePaymentStatus(cryptoPaymentData.transactionId, 'complete', transactionHash)
      
      toast({
        title: "Payment Complete",
        description: "Your crypto payment has been confirmed!",
        variant: "default"
      })
    }
    
    if (txError) {
      console.error('❌ Transaction failed:', txError)
      setCryptoPaymentStatus('failed')
      
      // Update status to failed in database
      if (cryptoPaymentData) {
        updatePaymentStatus(cryptoPaymentData.transactionId, 'failed')
      }
      
      toast({
        title: "Transaction Failed",
        description: txError.message || "Failed to send transaction",
        variant: "destructive"
      })
    }
  }, [isSuccess, txData, txError, cryptoPaymentData, toast])

  return (
    <div className="p-6 stripe-styled-form-container">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Pridi:wght@300;400;500;600&display=swap');
        
        /* Override global cyberpunk scrollbar styles for Stripe-styled forms */
        .stripe-styled-form-wrapper ::-webkit-scrollbar,
        .stripe-styled-form-wrapper::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .stripe-styled-form-wrapper ::-webkit-scrollbar-track,
        .stripe-styled-form-wrapper::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .stripe-styled-form-wrapper ::-webkit-scrollbar-thumb,
        .stripe-styled-form-wrapper::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        
        .stripe-styled-form-wrapper ::-webkit-scrollbar-thumb:hover,
        .stripe-styled-form-wrapper::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
        
        /* Firefox scrollbar override */
        .stripe-styled-form-wrapper,
        .stripe-styled-form-wrapper * {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
        }
        
        .stripe-checkout-form {
          font-family: 'Pridi', serif;
          color: #1a1f36;
          font-weight: 400;
        }
        
        .stripe-section-title {
          font-size: 20px;
          font-weight: 500;
          color: #1a1f36;
          margin-bottom: 20px;
          font-family: 'Pridi', serif;
        }
        
        .stripe-label {
          display: block;
          font-size: 14px;
          font-weight: 400;
          color: #697386;
          margin-bottom: 6px;
          font-family: 'Pridi', serif;
        }
        
        .stripe-input {
          width: 100%;
          padding: 10px 12px;
          font-size: 16px;
          font-family: 'Pridi', serif;
          font-weight: 400;
          line-height: 1.5;
          border: 1px solid #e0e6ed;
          border-radius: 6px;
          background-color: white;
          color: #1a1f36;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          -webkit-appearance: none;
        }
        
        .stripe-input:focus {
          outline: none;
          border-color: #3bffff;
          box-shadow: 0 0 0 1px #3bffff;
        }
        
        .stripe-input::placeholder {
          color: #8898aa;
          opacity: 1;
        }
        
        .stripe-input.error {
          border-color: #ed5f74;
        }
        
        .stripe-input.error:focus {
          box-shadow: 0 0 0 1px #ed5f74;
        }
        
        .stripe-input:disabled {
          background-color: #f6f9fc;
          color: #8898aa;
          cursor: not-allowed;
        }
        
        .stripe-error {
          color: #ed5f74;
          font-size: 13px;
          margin-top: 4px;
          font-family: 'Pridi', serif;
        }
        
        .stripe-select {
          width: 100%;
          padding: 10px 12px;
          padding-right: 32px;
          font-size: 16px;
          font-family: 'Pridi', serif;
          font-weight: 400;
          line-height: 1.5;
          border: 1px solid #e0e6ed;
          border-radius: 6px;
          background-color: white;
          color: #1a1f36;
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236b7c93' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 10px;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        
        .stripe-select:focus {
          outline: none;
          border-color: #3bffff;
          box-shadow: 0 0 0 1px #3bffff;
        }
        
        .stripe-select.error {
          border-color: #ed5f74;
        }
        
        .stripe-select.error:focus {
          box-shadow: 0 0 0 1px #ed5f74;
        }
        
        .stripe-select:disabled {
          background-color: #f6f9fc;
          color: #8898aa;
          cursor: not-allowed;
        }
        
        .stripe-checkbox-container {
          display: flex;
          align-items: flex-start;
          margin: 20px 0;
          cursor: pointer;
        }
        
        .stripe-checkbox {
          position: relative;
          width: 16px;
          height: 16px;
          margin-right: 12px;
          margin-top: 2px;
          flex-shrink: 0;
        }
        
        .stripe-checkbox input {
          position: absolute;
          opacity: 0;
          cursor: pointer;
          height: 0;
          width: 0;
        }
        
        .stripe-checkbox-visual {
          position: absolute;
          top: 0;
          left: 0;
          height: 16px;
          width: 16px;
          background-color: white;
          border: 1px solid #d1d9e0;
          border-radius: 3px;
          transition: all 0.15s ease;
        }
        
        .stripe-checkbox input:checked ~ .stripe-checkbox-visual {
          background-color: #3bffff;
          border-color: #3bffff;
        }
        
        .stripe-checkbox-visual:after {
          content: "";
          position: absolute;
          display: none;
          left: 5px;
          top: 2px;
          width: 5px;
          height: 9px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        
        .stripe-checkbox input:checked ~ .stripe-checkbox-visual:after {
          display: block;
        }
        
        .stripe-checkbox-label {
          font-size: 14px;
          color: #697386;
          line-height: 1.4;
          font-family: 'Pridi', serif;
        }
        
        .stripe-checkbox-label a {
          color: #3bffff;
          text-decoration: underline;
        }
        
        .stripe-button {
          width: 100%;
          padding: 12px 20px;
          font-size: 16px;
          font-weight: 500;
          font-family: 'Pridi', serif;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .stripe-button-primary {
          background: #3bffff;
          color: #1a1f36;
        }
        
        .stripe-button-primary:hover:not(:disabled) {
          background: #2ee5e5;
          transform: translateY(-1px);
          box-shadow: 0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08);
        }
        
        .stripe-button-secondary {
          background: white;
          color: #697386;
          border: 1px solid #e0e6ed;
        }
        
        .stripe-button-secondary:hover:not(:disabled) {
          color: #32325d;
          border-color: #c9d3e0;
          background: #f6f9fc;
        }
        
        .stripe-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .stripe-summary-box {
          background: #f6f9fc;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
        }
        
        .stripe-summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-family: 'Pridi', serif;
        }
        
        .stripe-summary-row:last-child {
          margin-bottom: 0;
          padding-top: 8px;
          border-top: 1px solid #e0e6ed;
          font-weight: 500;
        }
        
        .stripe-summary-label {
          color: #697386;
          font-size: 14px;
        }
        
        .stripe-summary-value {
          color: #1a1f36;
          font-size: 14px;
          font-weight: 500;
        }
        
        .stripe-divider {
          height: 1px;
          background: #e0e6ed;
          margin: 24px 0;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="stripe-checkout-form">
        <div className="mb-6">
          <h2 className="stripe-section-title">Shipping information</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="stripe-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`stripe-input ${errors.email ? 'error' : ''}`}
              placeholder="your@email.com"
              disabled={isSubmitting}
              autoComplete="email"
            />
            {errors.email && (
              <p className="stripe-error">{errors.email}</p>
            )}
          </div>

          <label className="stripe-checkbox-container">
            <div className="stripe-checkbox">
              <input
                type="checkbox"
                checked={keepUpdated}
                onChange={(e) => setKeepUpdated(e.target.checked)}
                disabled={isSubmitting}
              />
              <span className="stripe-checkbox-visual"></span>
            </div>
            <span className="stripe-checkbox-label">
              Keep me updated with news and personalized offers
            </span>
          </label>

          <div className="stripe-divider"></div>

          <div>
            <h3 className="stripe-label" style={{ fontSize: '16px', marginBottom: '16px', color: '#1a1f36' }}>
              Shipping address
            </h3>
          </div>

          <div>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`stripe-input ${errors.name ? 'error' : ''}`}
              placeholder="Full name"
              disabled={isSubmitting}
              autoComplete="name"
            />
            {errors.name && (
              <p className="stripe-error">{errors.name}</p>
            )}
          </div>

          <div>
            <select
              id="country"
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className={`stripe-select ${errors.country ? 'error' : ''}`}
              disabled={isSubmitting}
              autoComplete="country"
            >
              <option value="">Select country</option>
              {SHIPPING_COUNTRIES.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            {errors.country && (
              <p className="stripe-error">{errors.country}</p>
            )}
          </div>

          <div>
            <input
              id="line1"
              type="text"
              value={formData.line1}
              onChange={(e) => handleInputChange('line1', e.target.value)}
              className={`stripe-input ${errors.line1 ? 'error' : ''}`}
              placeholder="Address"
              disabled={isSubmitting}
              autoComplete="address-line1"
            />
            {errors.line1 && (
              <p className="stripe-error">{errors.line1}</p>
            )}
          </div>

          <div>
            <input
              id="line2"
              type="text"
              value={formData.line2}
              onChange={(e) => handleInputChange('line2', e.target.value)}
              className="stripe-input"
              placeholder="Address line 2 (optional)"
              disabled={isSubmitting}
              autoComplete="address-line2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className={`stripe-input ${errors.city ? 'error' : ''}`}
                placeholder="City"
                disabled={isSubmitting}
                autoComplete="address-level2"
              />
              {errors.city && (
                <p className="stripe-error">{errors.city}</p>
              )}
            </div>

            <div>
              <input
                id="postal_code"
                type="text"
                value={formData.postal_code}
                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                className={`stripe-input ${errors.postal_code ? 'error' : ''}`}
                placeholder="ZIP"
                disabled={isSubmitting}
                autoComplete="postal-code"
              />
              {errors.postal_code && (
                <p className="stripe-error">{errors.postal_code}</p>
              )}
            </div>
          </div>

          {regions.length > 0 && (
            <div>
              <select
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className={`stripe-select ${errors.state ? 'error' : ''}`}
                disabled={isSubmitting || !formData.country}
                autoComplete="address-level1"
              >
                <option value="">Select state</option>
                {/* @ts-ignore - region types are complex */}
                {regions.map((region: any) => (
                  <option key={region.shortCode || region.name} value={region.shortCode || region.name}>
                    {region.name}
                  </option>
                ))}
              </select>
              {errors.state && (
                <p className="stripe-error">{errors.state}</p>
              )}
            </div>
          )}
        </div>

        {subtotal && shippingPrice !== null && (
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

        {/* Payment Method Selection */}
        <div className="space-y-4">
          <h3 className="stripe-label" style={{ fontSize: '16px', marginBottom: '16px', color: '#1a1f36' }}>
            Payment Method
          </h3>
          
          <div className="space-y-3">
            {/* Stripe Payment Option */}
            <label className="stripe-checkbox-container cursor-pointer">
              <div className="stripe-checkbox">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="stripe"
                  checked={selectedPaymentMethod === 'stripe'}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value as 'stripe')}
                  disabled={isSubmitting}
                />
                <span className="stripe-checkbox-visual"></span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.274 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.407-2.354 1.407-1.852 0-4.963-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                  </svg>
                </div>
                <div>
                  <div className="stripe-checkbox-label font-medium">Pay with Card</div>
                  <div className="text-xs text-gray-500">Visa, Mastercard, etc.</div>
                </div>
              </div>
            </label>

            {/* Crypto Payment Option */}
            <label className="stripe-checkbox-container cursor-pointer">
              <div className="stripe-checkbox">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="crypto"
                  checked={selectedPaymentMethod === 'crypto'}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value as 'crypto')}
                  disabled={isSubmitting}
                />
                <span className="stripe-checkbox-visual"></span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div>
                  <div className="stripe-checkbox-label font-medium">Pay with Crypto</div>
                  <div className="text-xs text-gray-500">$9.00 + tax on Base Sepolia</div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Crypto Payment Section */}
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
                      <button
                        type="button"
                        disabled
                        className="w-full bg-gray-300 border-2 border-gray-400 text-gray-500 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                      >
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
                    <p className="text-sm text-gray-600">Wallet connected! Click "Create Crypto Payment" to complete the transaction.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Payment Details */}
                <div className="bg-white p-4 rounded border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Base Amount:</span>
                    <span className="font-medium">${(cryptoPaymentData.baseAmount / 100).toFixed(2)}</span>
                  </div>
                  {cryptoPaymentData.taxAmount > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Tax ({cryptoPaymentData.taxRate.toFixed(1)}%):</span>
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
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Currency:</span>
                    <span className="text-sm font-mono">ETH</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-sm text-gray-600">ETH Amount:</span>
                    <span className="text-sm font-mono font-bold">
                      {((cryptoPaymentData.amount / 100) / 3000).toFixed(6)} ETH
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-2">
                    {process.env.NEXT_PUBLIC_CHAIN_ID === '84532' || window.location.hostname === 'localhost'
                      ? 'Using fixed testnet ETH price: $3,000'
                      : 'Using real-time ETH price from Alchemy API'
                    }
                  </div>
                </div>

                {/* Wallet Connection */}
                {!isConnected ? (
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">Connect your wallet to send payment</p>
                    <div className="w-full">
                      {ready ? (
                        <WalletButton />
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="w-full bg-gray-300 border-2 border-gray-400 text-gray-500 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                        >
                          <Wallet className="w-4 h-4 mr-2 inline" />
                          Loading...
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Click "Connect Wallet" first, then "Create Crypto Payment"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Wallet Connected */}
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-green-800">Wallet Connected</span>
                      </div>
                      <span className="text-xs text-gray-600 font-mono">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </span>
                    </div>

                    {/* Payment Status */}
                    {cryptoPaymentStatus === 'processing' && (
                      <div className="flex items-center justify-center p-3 bg-blue-50 rounded-lg">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm text-blue-800">Processing payment...</span>
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

                    {/* Transaction Hash */}
                    {txHash && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Transaction Hash:</p>
                        <p className="text-xs font-mono text-gray-600 break-all">{txHash}</p>
                      </div>
                    )}

                    {/* Payment is already created and wallet is connected - show status */}
                    {cryptoPaymentStatus === 'pending' && (
                      <div className="text-center py-4">
                        <p className="text-gray-600 mb-4">Payment created! Click "Send Transaction" to complete the payment.</p>
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
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="stripe-button stripe-button-secondary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isProcessingCrypto}
            className="stripe-button stripe-button-primary"
          >
            {isSubmitting || isProcessingCrypto ? 'Processing...' : 
             selectedPaymentMethod === 'crypto' ? 
               (isConnected ? (cryptoPaymentData ? 'Send Transaction' : 'Create Crypto Payment') : 'Connect Wallet First') : 
               'Continue to payment'}
          </button>
        </div>
      </form>
    </div>
  )
}
