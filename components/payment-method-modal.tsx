'use client'

import { useState } from 'react'
// Removed Dialog import - using custom modal
import { Button } from '@/components/ui/button'
import { CreditCard, Coins, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PaymentMethodModalProps {
  isOpen: boolean
  onClose: () => void
  onStripeSelected: () => void
  onCryptoSelected: (shippingAddress: any) => void
  shippingAddress: any
  subtotal: number
}

export function PaymentMethodModal({ 
  isOpen, 
  onClose, 
  onStripeSelected, 
  onCryptoSelected, 
  shippingAddress,
  subtotal 
}: PaymentMethodModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const handleStripePayment = () => {
    onStripeSelected()
    onClose()
  }

  const handleCryptoPayment = async () => {
    setIsProcessing(true)
    try {
      await onCryptoSelected(shippingAddress)
      onClose()
    } catch (error) {
      console.error('Crypto payment error:', error)
      toast({
        title: "Payment Error",
        description: "Failed to process crypto payment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-center text-xl font-semibold mb-6">
            Choose Payment Method
          </h2>
        
        <div className="space-y-4 py-4">
          <div className="text-center text-sm text-gray-600 mb-6">
            Total Amount: ${(subtotal / 100).toFixed(2)}
          </div>
          
          <div className="space-y-3">
            {/* Stripe Payment Option */}
            <Button
              onClick={handleStripePayment}
              className="w-full h-16 flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isProcessing}
            >
              <CreditCard className="h-6 w-6" />
              <div className="text-left">
                <div className="font-semibold">Pay with Card</div>
                <div className="text-sm opacity-90">Visa, Mastercard, etc.</div>
              </div>
            </Button>

            {/* Crypto Payment Option */}
            <Button
              onClick={handleCryptoPayment}
              className="w-full h-16 flex items-center justify-center gap-3 bg-orange-600 hover:bg-orange-700 text-white"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Coins className="h-6 w-6" />
              )}
              <div className="text-left">
                <div className="font-semibold">Pay with Crypto</div>
                <div className="text-sm opacity-90">$9.00 + tax</div>
              </div>
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 text-center pt-2">
            Crypto payments are processed at a fixed rate of $9.00 plus applicable taxes
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

