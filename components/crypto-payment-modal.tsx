'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Check, ExternalLink, Loader2, Wallet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { usePrivy } from '@privy-io/react-auth'
import { useAccount, useConnect, useSendTransaction } from 'wagmi'
import { parseEther } from 'viem'

interface CryptoPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  paymentData: {
    transactionId: string
    amount: number
    baseAmount: number
    taxAmount: number
    taxRate: number
    receivingAddress: string
    paymentId: string
    message: string
  } | null
}

export function CryptoPaymentModal({ isOpen, onClose, paymentData }: CryptoPaymentModalProps) {
  const [copied, setCopied] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'confirmed' | 'failed'>('pending')
  const [txHash, setTxHash] = useState('')
  const { toast } = useToast()

  // Debug logging
  console.log('🔍 CryptoPaymentModal render:', { isOpen, paymentData: !!paymentData })
  
  // Privy and Wagmi hooks
  const { ready, authenticated, login } = usePrivy()
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { sendTransaction, isPending, isSuccess, data: txData, error: txError } = useSendTransaction()

  // Monitor transaction status
  useEffect(() => {
    if (isSuccess && txData) {
      // txData should be the transaction hash
      const transactionHash = String(txData)
      setTxHash(transactionHash)
      setPaymentStatus('processing')
      
      // Update payment status in database
      updatePaymentStatus('submitted', transactionHash)
      
      toast({
        title: "Transaction Sent!",
        description: "Your payment is being processed. You'll receive confirmation shortly.",
      })
    }
    
    if (txError) {
      setPaymentStatus('failed')
      toast({
        title: "Transaction Failed",
        description: txError.message || "Failed to send transaction",
        variant: "destructive"
      })
    }
  }, [isSuccess, txData, txError, toast])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Copied!",
        description: "Address copied to clipboard",
      })
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const updatePaymentStatus = async (status: string, transactionHash?: string) => {
    try {
      const response = await fetch('/api/crypto-payment/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: paymentData?.paymentId,
          status,
          transactionHash,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update payment status')
      }
    } catch (error) {
      console.error('Status update error:', error)
    }
  }

  const handleSendPayment = async () => {
    if (!paymentData) return
    
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to send payment",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    setPaymentStatus('processing')

    try {
      // Get ETH price (real-time for mainnet, fixed for testnet)
      const ethPrice = await getETHPrice()
      const amountInUSD = paymentData.amount / 100 // Convert cents to USD
      const ethAmount = (amountInUSD / ethPrice).toFixed(6)
      
      const networkName = process.env.NEXT_PUBLIC_CHAIN_ID === '84532' ? 'Base Sepolia' : 'Base Mainnet'
      console.log(`💸 Sending ${ethAmount} ETH ($${amountInUSD.toFixed(2)}) on ${networkName}`)
      
      await sendTransaction({
        to: paymentData.receivingAddress as `0x${string}`,
        value: parseEther(ethAmount),
      })
      
    } catch (error) {
      console.error('Payment error:', error)
      setPaymentStatus('failed')
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to send payment",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

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

  const handleConnectWallet = async () => {
    if (!ready) return
    
    // Use the same pattern as WalletButton component
    const first = connectors.find(c => c.ready)
    
    if (first) {
      connect({ connector: first })
    } else {
      await login()
    }
  }

  return (
    <Dialog open={isOpen && !!paymentData} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" style={{ zIndex: 200 }}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold">
            Complete Crypto Payment
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {!paymentData ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading payment details...</div>
            </div>
          ) : (
            <>
              {/* Payment Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Base Amount:</span>
              <span className="font-medium">${(paymentData.baseAmount / 100).toFixed(2)}</span>
            </div>
            {paymentData.taxAmount > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tax ({paymentData.taxRate.toFixed(1)}%):</span>
                  <span className="font-medium">${(paymentData.taxAmount / 100).toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Total Amount:</span>
              <span className="font-bold text-lg">${(paymentData.amount / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 border-t pt-2">
              <span>Network:</span>
              <span className="font-mono">Base Sepolia</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Currency:</span>
              <span className="font-mono">ETH</span>
            </div>
          </div>

          {/* Receiving Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Send to this address:</Label>
            <div className="flex gap-2">
              <Input
                id="address"
                value={paymentData.receivingAddress}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(paymentData.receivingAddress)}
                className="px-3"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Wallet Connection Status */}
          <div className="space-y-3">
            {!isConnected ? (
              <div className="text-center space-y-3">
                <div className="text-sm text-gray-600">
                  Connect your wallet to send payment automatically
                </div>
                <Button
                  onClick={handleConnectWallet}
                  className="w-full bg-cyber-dark border-2 border-cyber-green text-cyber-green hover:bg-cyber-green/10"
                  disabled={!ready}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect&nbsp;Wallet
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
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
                {paymentStatus === 'processing' && (
                  <div className="flex items-center justify-center p-3 bg-blue-50 rounded-lg">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-800">Processing payment...</span>
                  </div>
                )}

                {paymentStatus === 'confirmed' && (
                  <div className="flex items-center justify-center p-3 bg-green-50 rounded-lg">
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">Payment confirmed!</span>
                  </div>
                )}

                {paymentStatus === 'failed' && (
                  <div className="flex items-center justify-center p-3 bg-red-50 rounded-lg">
                    <span className="text-sm text-red-800">Payment failed. Please try again.</span>
                  </div>
                )}

                {/* Transaction Hash Display */}
                {txHash && (
                  <div className="space-y-2">
                    <Label>Transaction Hash:</Label>
                    <div className="flex gap-2">
                      <Input
                        value={txHash}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(txHash)}
                        className="px-3"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            {isConnected && paymentStatus === 'pending' && (
              <Button
                onClick={handleSendPayment}
                disabled={isProcessing || isPending}
                className="flex-1"
              >
                {isProcessing || isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Payment'
                )}
              </Button>
            )}
            {paymentStatus === 'confirmed' && (
              <Button
                onClick={onClose}
                className="flex-1"
              >
                Complete Order
              </Button>
            )}
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Send exactly ${(paymentData.amount / 100).toFixed(2)} USD worth of ETH to the address above.</p>
            <p>
              {process.env.NEXT_PUBLIC_CHAIN_ID === '84532' || window.location.hostname === 'localhost'
                ? 'Using fixed testnet ETH price of $3,000 for Base Sepolia.'
                : 'Using real-time ETH price from Alchemy API.'
              }
            </p>
            <p>
              Make sure you're connected to {process.env.NEXT_PUBLIC_CHAIN_ID === '84532' ? 'Base Sepolia testnet' : 'Base Mainnet'}.
            </p>
          </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

