"use client"

import { useState } from "react"
import { StripeStyledShippingForm, type ShippingAddress } from "./stripe-styled-shipping-form"
import { ArrowLeft } from "lucide-react"
import { csrfFetch } from "@/lib/csrf-client"

import type { CartItem } from "@/lib/cart-context"

interface StripeStyledCartCheckoutModalProps {
  cartItems: CartItem[]
  subtotal: number
  onBack: () => void
  onSuccess: () => void
}

export function StripeStyledCartCheckoutModal({ cartItems, subtotal, onBack, onSuccess }: StripeStyledCartCheckoutModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  
  const handleSubmit = async (address: ShippingAddress) => {
    setIsProcessing(true)
    
    try {
      // Build line items from cart
      const lineItems = cartItems.flatMap((item) => {
        const cardItem = {
          productId: item.type === 'limited-edition' ? 'limited-edition-card' : 'custom-card',
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          name: item.name,
          image: item.image,
          ...(item.type === 'custom-card' && {
            cardFinish: item.cardFinish,
            customImageUrl: item.image,
            uploadId: item.uploadId
          })
        }
        
        const items = [cardItem]
        
        if (item.includeDisplayCase && item.displayCaseQuantity > 0) {
          items.push({
            productId: 'display-case',
            quantity: item.displayCaseQuantity,
            pricePerUnit: item.displayCasePricePerUnit || 19.00,
            name: 'Acrylic Display Case',
            image: '/display-case.jpg'
          })
        }
        
        return items
      })

      const response = await csrfFetch('/api/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ 
          cartItems: lineItems,
          isCartCheckout: true,
          shippingAddress: address
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const data = await response.json()
      
      // Call success callback to clear cart
      onSuccess()
      
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start checkout')
      setIsProcessing(false)
    }
  }
  
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Pridi:wght@300;400;500;600&display=swap');
        
        .stripe-modal-container {
          font-family: 'Pridi', serif;
          background: white;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .stripe-modal-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          border-bottom: 1px solid #e0e6ed;
          background: white;
        }
        
        .stripe-modal-back-button {
          background: none;
          border: none;
          color: #697386;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.15s ease;
        }
        
        .stripe-modal-back-button:hover:not(:disabled) {
          background: #f6f9fc;
          color: #1a1f36;
        }
        
        .stripe-modal-back-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .stripe-modal-title {
          font-size: 20px;
          font-weight: 500;
          color: #1a1f36;
          margin: 0;
          font-family: 'Pridi', serif;
        }
        
        .stripe-modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          background: #fafbfc;
        }
        
        .stripe-modal-content-inner {
          max-width: 480px;
          margin: 0 auto;
        }
        
        .stripe-order-summary {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
          border: 1px solid #e0e6ed;
        }
        
        .stripe-order-summary-title {
          font-size: 16px;
          font-weight: 500;
          color: #1a1f36;
          margin-bottom: 16px;
          font-family: 'Pridi', serif;
        }
        
        .stripe-order-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f0f3f7;
          font-family: 'Pridi', serif;
        }
        
        .stripe-order-item:last-of-type {
          border-bottom: none;
        }
        
        .stripe-order-item-details {
          flex: 1;
        }
        
        .stripe-order-item-name {
          font-size: 14px;
          color: #1a1f36;
          margin-bottom: 4px;
        }
        
        .stripe-order-item-quantity {
          font-size: 13px;
          color: #697386;
        }
        
        .stripe-order-item-price {
          font-size: 14px;
          font-weight: 500;
          color: #1a1f36;
        }
        
        .stripe-order-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          margin-top: 16px;
          border-top: 1px solid #e0e6ed;
          font-family: 'Pridi', serif;
        }
        
        .stripe-order-total-label {
          font-size: 16px;
          font-weight: 500;
          color: #1a1f36;
        }
        
        .stripe-order-total-value {
          font-size: 20px;
          font-weight: 600;
          color: #1a1f36;
        }
        
        .stripe-shipping-note {
          font-size: 13px;
          color: #697386;
          margin-top: 8px;
          text-align: center;
          font-family: 'Pridi', serif;
        }
        
        .stripe-form-container {
          background: white;
          border-radius: 8px;
          padding: 24px;
          border: 1px solid #e0e6ed;
        }
      `}</style>

      <div className="stripe-modal-container">
        {/* Header */}
        <div className="stripe-modal-header">
          <button
            onClick={onBack}
            className="stripe-modal-back-button"
            disabled={isProcessing}
            type="button"
          >
            <ArrowLeft className="w-20 h-20" />
          </button>
          <h2 className="stripe-modal-title">Complete your order</h2>
        </div>
        
        {/* Content */}
        <div className="stripe-modal-content">
          <div className="stripe-modal-content-inner">
            {/* Order Summary */}
            <div className="stripe-order-summary">
              <h3 className="stripe-order-summary-title">Order Summary</h3>
              
              {cartItems.map((item, index) => (
                <div key={index}>
                  <div className="stripe-order-item">
                    <div className="stripe-order-item-details">
                      <div className="stripe-order-item-name">{item.name}</div>
                      <div className="stripe-order-item-quantity">
                        Quantity: {item.quantity} × ${item.pricePerUnit.toFixed(2)}
                      </div>
                    </div>
                    <div className="stripe-order-item-price">
                      ${(item.quantity * item.pricePerUnit).toFixed(2)}
                    </div>
                  </div>
                  
                  {item.includeDisplayCase && item.displayCaseQuantity > 0 && (
                    <div className="stripe-order-item">
                      <div className="stripe-order-item-details">
                        <div className="stripe-order-item-name">Acrylic Display Case</div>
                        <div className="stripe-order-item-quantity">
                          Quantity: {item.displayCaseQuantity} × ${(item.displayCasePricePerUnit || 19.00).toFixed(2)}
                        </div>
                      </div>
                      <div className="stripe-order-item-price">
                        ${(item.displayCaseQuantity * (item.displayCasePricePerUnit || 19.00)).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="stripe-order-total">
                <span className="stripe-order-total-label">Subtotal</span>
                <span className="stripe-order-total-value">${subtotal.toFixed(2)}</span>
              </div>
              
              <p className="stripe-shipping-note">
                Shipping and taxes calculated at next step
              </p>
            </div>
            
            {/* Shipping Form */}
            <div className="stripe-form-container">
              <StripeStyledShippingForm
                onSubmit={handleSubmit}
                onBack={onBack}
                isSubmitting={isProcessing}
                subtotal={subtotal}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}