"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import dynamic from "next/dynamic"

// Lazy load the 3D preview wrapper component
const CustomCard3DPreviewWrapper = dynamic(() => import("./CustomCard3DPreviewWrapper"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-cyber-purple animate-pulse">Loading 3D preview...</div>
    </div>
  ),
})
import { StripeStyledShippingForm, type ShippingAddress } from "./stripe-styled-shipping-form"
// Payment method selection is now integrated into shipping form
import { CryptoPaymentModal } from "./crypto-payment-modal"
import { Minus, Plus, ShoppingCart, Star, Zap, Shield, AlertCircle, Loader2, X, Eye, EyeOff, ShoppingBag } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { csrfFetch } from "@/lib/csrf-client"

interface MarketplaceCheckoutModalProps {
  isOpen: boolean
  onClose?: () => void
  listing: {
    id: string
    title: string
    image_url: string | null
    price_cents: number
    seller_id: string
  } | null
}

// Quantity configuration
const QUANTITY_CONFIG = {
  MIN: 1,
  MAX: 100,
  DEFAULT: 1,
}

// Create a flippable card preview component for marketplace listings
function MarketplaceCardPreview({ imageUrl, cardFinish, title }: { imageUrl: string | null, cardFinish?: 'matte' | 'rainbow' | 'gloss', title: string }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasIntroPlayed, setHasIntroPlayed] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const touchStartRef = useRef(false)

  // Screen size detection for performance optimizations
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768)
    }
    
    if (typeof window !== 'undefined') {
      checkScreenSize()
      window.addEventListener('resize', checkScreenSize)
      return () => window.removeEventListener('resize', checkScreenSize)
    }
  }, [])

  // Detect touch capability on mount and play intro animation
  useEffect(() => {
    const checkTouchSupport = () => {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0
    }
    setIsTouchDevice(checkTouchSupport())
    
    // Reset animation states when image changes
    if (imageUrl) {
      setIsLoaded(false)
      setHasIntroPlayed(false)
      setIsFlipped(false)
      
      // Start intro animation sequence
      setTimeout(() => {
        setIsLoaded(true)
        // Mark intro as played after animation completes
        setTimeout(() => {
          setHasIntroPlayed(true)
        }, 1000)
      }, 100)
    }
  }, [imageUrl])

  const handleCardInteraction = () => {
    setIsFlipped(!isFlipped)
  }

  const handleTouchStart = () => {
    touchStartRef.current = true
    handleCardInteraction()
  }

  const handleMouseEnter = () => {
    // Only respond to mouse events if no recent touch occurred and not a touch device
    if (!touchStartRef.current && !isTouchDevice) {
      setIsFlipped(true)
    }
  }

  const handleMouseLeave = () => {
    // Only respond to mouse events if no recent touch occurred and not a touch device
    if (!touchStartRef.current && !isTouchDevice) {
      setIsFlipped(false)
    }
  }

  const handleClick = () => {
    // Reset touch flag after a short delay to allow mouse events to work again
    if (touchStartRef.current) {
      setTimeout(() => {
        touchStartRef.current = false
      }, 300)
    }
    // For non-touch devices, handle click as toggle
    if (!isTouchDevice) {
      handleCardInteraction()
    }
  }

  if (!imageUrl) {
    return (
      <div className="relative w-full mx-auto font-mono">
        <div className="relative w-full cursor-pointer mx-auto" style={{ aspectRatio: "2.5 / 3.5", maxWidth: "600px" }}>
          <div className="relative w-full h-full rounded-xl border-2 border-cyber-cyan/50 shadow-2xl overflow-hidden bg-cyber-dark/80 flex items-center justify-center">
            <p className="text-gray-400">No image available</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full mx-auto font-mono">
      {/* Card Container with 3D flip effect - Standard playing card ratio 2.5:3.5 */}
      <div
        className={`relative w-full cursor-pointer mx-auto touch-manipulation custom-card-container transition-all duration-700 ${
          isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{
          ...(isSmallScreen ? {} : { perspective: "1000px" }),
          aspectRatio: "2.5 / 3.5",
          maxWidth: "600px"
        }}
        onMouseEnter={hasIntroPlayed ? handleMouseEnter : undefined}
        onMouseLeave={hasIntroPlayed ? handleMouseLeave : undefined}
        onClick={hasIntroPlayed ? handleClick : undefined}
        onTouchStart={hasIntroPlayed ? handleTouchStart : undefined}
      >
        <div
          className={
            isSmallScreen
              ? "relative w-full h-full"
              : `relative w-full h-full transition-transform duration-700 ease-in-out transform-style-preserve-3d ${
                  isFlipped ? "rotate-y-180" : ""
                } ${isLoaded && !hasIntroPlayed ? "animate-spin-intro" : ""}`
          }
          style={
            isSmallScreen 
              ? {} 
              : {
                  // Force 3D transform context from the start to prevent initial pixelation
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  willChange: 'transform'
                }
          }
        >
          {/* Front of Card - Marketplace listing image */}
          <div className={
            isSmallScreen 
              ? `absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                  isFlipped ? "opacity-0" : "opacity-100"
                }`
              : "absolute inset-0 w-full h-full backface-hidden"
          }>
            <div className="relative w-full h-full rounded-xl border-2 border-cyber-cyan/50 shadow-2xl overflow-hidden">
              {/* Marketplace listing image as the card front */}
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-fill image-high-quality"
                style={{
                  willChange: 'transform',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden'
                }}
              />
              
              {/* Rainbow Foil Effect Overlay - Only show for rainbow finish */}
              {cardFinish === 'rainbow' && (
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                  {/* Primary rainbow foil bands - hidden on small screens for performance */}
                  {!isSmallScreen && <div 
                    className="absolute opacity-60 mix-blend-overlay"
                    style={{
                      top: '-50%',
                      bottom: '-50%',
                      left: '-50%',
                      right: '-50%',
                      background: `
                        repeating-linear-gradient(
                          45deg,
                          rgba(255, 0, 0, 0.3) 0px,
                          rgba(255, 154, 0, 0.3) 15px,
                          rgba(255, 255, 0, 0.3) 30px,
                          rgba(0, 255, 0, 0.3) 45px,
                          rgba(0, 255, 255, 0.3) 60px,
                          rgba(0, 0, 255, 0.3) 75px,
                          rgba(255, 0, 255, 0.3) 90px,
                          rgba(255, 0, 0, 0.3) 105px
                        )
                      `,
                      animation: 'rainbowShift 15s ease-in-out infinite',
                      animationDelay: '0s',
                      animationFillMode: 'both',
                      willChange: 'transform',
                      transform: 'translate3d(-50px, 0, 0) skewX(0deg)',
                      backfaceVisibility: 'hidden'
                    }}
                  />}
                  
                  {/* Secondary rainbow layer for depth - hidden on small screens for performance */}
                  {!isSmallScreen && <div 
                    className="absolute opacity-40 mix-blend-soft-light"
                    style={{
                      top: '-50%',
                      bottom: '-50%',
                      left: '-50%',
                      right: '-50%',
                      background: `
                        repeating-linear-gradient(
                          125deg,
                          rgba(255, 0, 128, 0.2) 0px,
                          rgba(0, 255, 255, 0.2) 25px,
                          rgba(255, 255, 0, 0.2) 50px,
                          rgba(138, 43, 226, 0.2) 75px,
                          rgba(0, 255, 65, 0.2) 100px,
                          rgba(255, 0, 128, 0.2) 125px
                        )
                      `,
                      animation: 'rainbowShift 12s ease-in-out infinite reverse',
                      animationDelay: '0.1s',
                      animationFillMode: 'both',
                      willChange: 'transform',
                      transform: 'translate3d(-50px, 0, 0) skewX(0deg)',
                      backfaceVisibility: 'hidden'
                    }}
                  />}
                  
                  {/* Enhanced prismatic shine - GPU optimized */}
                  <div 
                    className="absolute inset-0 opacity-15"
                    style={{
                      background: `
                        linear-gradient(
                          75deg,
                          transparent 0%,
                          rgba(255, 255, 255, 0.1) 12%,
                          rgba(255, 255, 255, 0.2) 18%,
                          transparent 25%,
                          transparent 75%,
                          rgba(255, 255, 255, 0.2) 82%,
                          rgba(255, 255, 255, 0.1) 88%,
                          transparent 100%
                        )
                      `,
                      animation: 'prismaticShine 12s ease-in-out infinite',
                      animationDelay: '0.2s',
                      animationFillMode: 'both',
                      willChange: 'transform',
                      transform: 'translate3d(-200%, 0, 0) skewX(-15deg)',
                      backfaceVisibility: 'hidden'
                    }}
                  />
                  
                  {/* Holographic spots - GPU optimized with selective intensity */}
                  <div 
                    className="absolute inset-0 opacity-90"
                    style={{
                      background: `
                        radial-gradient(circle at 30% 20%, rgba(255, 0, 255, 0.5) 0%, transparent 25%),
                        radial-gradient(circle at 70% 80%, rgba(0, 255, 255, 0.5) 0%, transparent 25%),
                        radial-gradient(circle at 80% 30%, rgba(255, 255, 0, 0.3) 0%, transparent 25%),
                        radial-gradient(circle at 20% 70%, rgba(0, 255, 0, 0.35) 0%, transparent 25%)
                      `,
                      animation: 'holographicSpots 18s ease-in-out infinite',
                      animationDelay: '0.3s',
                      animationFillMode: 'both',
                      willChange: 'transform',
                      transform: 'scale3d(1.8, 1.8, 1) rotate(0deg)',
                      backfaceVisibility: 'hidden'
                    }}
                  />
                </div>
              )}
              
              {/* Glossy Finish Effect - Light swipe animation */}
              {cardFinish === 'gloss' && (
                <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                  {/* Light swipe effect */}
                  <div 
                    className="absolute inset-0 opacity-15"
                    style={{
                      background: `
                        linear-gradient(
                          75deg,
                          transparent 0%,
                          rgba(255, 255, 255, 0.1) 12%,
                          rgba(255, 255, 255, 0.2) 18%,
                          transparent 25%,
                          transparent 75%,
                          rgba(255, 255, 255, 0.2) 82%,
                          rgba(255, 255, 255, 0.1) 88%,
                          transparent 100%
                        )
                      `,
                      animation: 'glossyShine 4.5s ease-in-out infinite',
                      animationDelay: '0s',
                      animationFillMode: 'both',
                      willChange: 'transform',
                      transform: 'translate3d(-125%, 0, 0) skewX(-15deg)',
                      backfaceVisibility: 'hidden'
                    }}
                  />
                </div>
              )}
              
            </div>
          </div>

          {/* Back of Card */}
          <div className={
            isSmallScreen
              ? `absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                  isFlipped ? "opacity-100" : "opacity-0"
                }`
              : "absolute inset-0 w-full h-full backface-hidden rotate-y-180"
          }>
            <div className="relative w-full h-full rounded-xl border-2 border-cyber-pink/50 shadow-2xl cyber-card-glow-gradient overflow-hidden">
              {/* Static image for the back of the card */}
              <Image
                src="/redbackbleed111111.jpg"
                alt="Card Back"
                fill
                quality={85}
                className="object-cover rounded-xl"
              />
              
              {/* Custom overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyber-pink/10 via-transparent to-cyber-purple/10 rounded-xl" />

              {/* Scanlines - Disabled on mobile for performance */}
              {!isSmallScreen && <div className="absolute inset-0 scanlines opacity-20 rounded-xl" />}
            </div>
          </div>
        </div>
      </div>

      {/* Flip Instruction - Mobile-friendly */}
      <div className={`text-center mt-4 transition-opacity duration-500 ${hasIntroPlayed ? 'opacity-100' : 'opacity-0'}`}>
        <p className="text-xs text-gray-400 tracking-wide">
          {isFlipped ? "Showing card back" : isTouchDevice ? "Tap to flip card" : "Tap or hover to flip card"}
        </p>
      </div>
    </div>
  )
}

export function MarketplaceCheckoutModal({ isOpen, onClose, listing }: MarketplaceCheckoutModalProps) {
  // State for smooth closing animation
  const [isClosing, setIsClosing] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobilePreviewActive, setMobilePreviewActive] = useState(false)
  const [showCase3DPreview, setShowCase3DPreview] = useState(false)
  const [fadeTransition, setFadeTransition] = useState({
    isTransitioning: false,
    show3D: false
  })
  const [animationKey, setAnimationKey] = useState(0)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Cart functionality
  const { addItem } = useCart()
  const [showAddedToCart, setShowAddedToCart] = useState(false)
  
  // Handle smooth open/close transitions
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setIsClosing(false)
      // Reset to defaults when opening
      setQuantity(QUANTITY_CONFIG.DEFAULT)
      setCardFinish('matte')
      setIncludeDisplayCase(false)
      setDisplayCaseQuantity(1)
      setCurrentStep('quantity')
      setMobilePreviewActive(false)
      setShowCase3DPreview(false)
      setFadeTransition({ isTransitioning: false, show3D: false })
      setAnimationKey(prev => prev + 1) // Force re-render of 3D component
    } else if (isVisible) {
      setIsClosing(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setIsClosing(false)
      }, 300) // Match animation duration
      return () => clearTimeout(timer)
    }
  }, [isOpen, isVisible])

  // Form state
  const [quantity, setQuantity] = useState<number>(QUANTITY_CONFIG.DEFAULT)
  const [cardFinish, setCardFinish] = useState<'matte' | 'rainbow' | 'gloss'>('matte')
  const [includeDisplayCase, setIncludeDisplayCase] = useState(false)
  const [displayCaseQuantity, setDisplayCaseQuantity] = useState(1)
  const [currentStep, setCurrentStep] = useState<'quantity' | 'shipping' | 'payment_method'>('quantity')
  const [isOrdering, setIsOrdering] = useState(false)
  // Payment method selection is now integrated into shipping form
  const [showCryptoPaymentModal, setShowCryptoPaymentModal] = useState(false)
  const [cryptoPaymentData, setCryptoPaymentData] = useState<any>(null)
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null)
  
  const modalRef = useRef<HTMLDivElement>(null)

  // Debug modal state changes
  useEffect(() => {
    console.log('🔍 Modal state changed:', { 
      showCryptoPaymentModal,
      shippingAddress: shippingAddress ? 'set' : 'null'
    })
  }, [showCryptoPaymentModal, shippingAddress])
  const firstFocusableRef = useRef<HTMLButtonElement>(null)
  const lastFocusableRef = useRef<HTMLButtonElement>(null)

  // Calculate pricing with bulk discounts
  const getCurrentPricing = () => {
    if (!listing) return { totalPrice: 0, pricePerUnit: 0, discount: 0, savings: 0 }
    
    const basePrice = listing.price_cents / 100
    const cardFinishPrice = (cardFinish === 'rainbow' || cardFinish === 'gloss') ? 4.00 : 0
    const basePriceWithFinish = basePrice + cardFinishPrice
    
    // Apply bulk discount tiers (same as custom cards)
    let discount = 0
    let pricePerUnit = basePriceWithFinish
    
    if (quantity >= 10) {
      discount = 50
      pricePerUnit = basePriceWithFinish * 0.50
    } else if (quantity >= 5) {
      discount = 35
      pricePerUnit = basePriceWithFinish * 0.65
    } else if (quantity >= 2) {
      discount = 25
      pricePerUnit = basePriceWithFinish * 0.75
    }
    
    const cardsTotalPrice = pricePerUnit * quantity
    const originalPrice = basePriceWithFinish * quantity
    const savings = originalPrice - cardsTotalPrice
    
    // Display case pricing
    const displayCasePrice = 19.00
    const displayCaseTotalPrice = includeDisplayCase ? (displayCasePrice * displayCaseQuantity) : 0
    const totalPrice = cardsTotalPrice + displayCaseTotalPrice

    return {
      pricePerUnit,
      totalPrice,
      cardsTotalPrice,
      displayCaseTotalPrice,
      discount,
      savings,
      basePriceWithFinish,
    }
  }

  const currentPricing = getCurrentPricing()
  
  // Optimized 3D preview handlers with responsive transitions
  const handleShow3DPreview = () => {
    if (isMobile && !mobilePreviewActive) return
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    
    // Small delay on hover in to prevent flickering from rapid mouse movements
    hoverTimeoutRef.current = setTimeout(() => {
      setAnimationKey(prev => prev + 1) // Restart 3D animation
      setFadeTransition({ isTransitioning: true, show3D: true })
      setTimeout(() => {
        setShowCase3DPreview(true)
        setFadeTransition({ isTransitioning: false, show3D: true })
      }, 150) // Reduced delay for faster response
    }, 100) // Small debounce delay
  }

  const handleHide3DPreview = () => {
    if (isMobile && mobilePreviewActive) return // Don't hide on mobile when actively previewing
    if (includeDisplayCase) return // Don't hide when display case is selected
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    
    // Immediate response on hover off for better UX
    setFadeTransition({ isTransitioning: true, show3D: false })
    setTimeout(() => {
      setShowCase3DPreview(false)
      setFadeTransition({ isTransitioning: false, show3D: false })
    }, 150) // Reduced delay for faster response
  }

  // Mobile-specific tap to preview handler
  const handleMobilePreviewTap = () => {
    if (!isMobile) return
    
    setMobilePreviewActive(!mobilePreviewActive)
    
    if (!mobilePreviewActive) {
      // Show preview
      setAnimationKey(prev => prev + 1) // Restart 3D animation
      setFadeTransition({ isTransitioning: true, show3D: true })
      setTimeout(() => {
        setShowCase3DPreview(true)
        setFadeTransition({ isTransitioning: false, show3D: true })
      }, 300)
    } else {
      // Hide preview
      setFadeTransition({ isTransitioning: true, show3D: false })
      setTimeout(() => {
        setShowCase3DPreview(false)
        setFadeTransition({ isTransitioning: false, show3D: false })
      }, 300)
    }
  }

  // Detect screen size for performance optimizations  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768)
    }
    
    if (typeof window !== 'undefined') {
      checkScreenSize()
      window.addEventListener('resize', checkScreenSize)
      return () => window.removeEventListener('resize', checkScreenSize)
    }
  }, [])

  // Detect mobile/tablet devices to disable hover effects
  useEffect(() => {
    const checkIsMobile = () => {
      return window.innerWidth < 1024 || 'ontouchstart' in window || navigator.maxTouchPoints > 0
    }
    
    setIsMobile(checkIsMobile())
    
    const handleResize = () => {
      setIsMobile(checkIsMobile())
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus()
    }
  }, [isOpen])

  // Keyboard navigation and escape handling
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }

      // Tab cycling within modal
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        
        if (!focusableElements || focusableElements.length === 0) return

        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (e.shiftKey) {
          // Shift + Tab (backwards)
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          // Tab (forwards)
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose?.()
    }
  }

  const handleContinueToShipping = () => {
    if (!listing) return
    setCurrentStep('shipping')
  }
  
  const handleAddToCart = () => {
    if (!listing) return
    
    const marketplaceItem = {
      type: 'marketplace' as const,
      name: listing.title,
      image: listing.image_url || '/placeholder.svg',
      listingId: listing.id,
      sellerId: listing.seller_id,
      priceCents: (currentPricing.cardsTotalPrice || 0) * 100, // Convert back to cents
      quantity: quantity,
      basePricePerUnit: currentPricing.pricePerUnit, // For marketplace, base price is the listing price
      includeDisplayCase: includeDisplayCase,
      displayCaseQuantity: displayCaseQuantity,
      cardFinish: cardFinish
    } as any
    
    addItem(marketplaceItem)
    
    // Show confirmation message
    setShowAddedToCart(true)
    setTimeout(() => {
      setShowAddedToCart(false)
      onClose?.()
    }, 1500)
  }

  const handleBackToQuantity = () => {
    setCurrentStep('quantity')
  }

  const handleShippingSubmit = async (address: ShippingAddress, paymentMethod: 'stripe' | 'crypto') => {
    if (!listing) return
    
    console.log('🚚 Shipping form submitted:', { address, paymentMethod })
    
    // Store shipping address
    setShippingAddress(address)
    
    // Handle payment based on selected method
    if (paymentMethod === 'stripe') {
      await handleStripePaymentSelected()
    } else if (paymentMethod === 'crypto') {
      await handleCryptoPaymentSelected(address)
    }
  }

  const handleStripePaymentSelected = async () => {
    if (!listing || !shippingAddress) return
    
    setIsOrdering(true)
    
    try {
      console.log('🛒 Creating marketplace payment intent...', {
        listingId: listing.id,
        quantity,
        shippingAddress,
      })
      
      // Create payment intent for marketplace listing
      const response = await csrfFetch('/api/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({ 
          listingId: listing.id,
          quantity,
          includeDisplayCase,
          displayCaseQuantity,
          cardFinish,
          shippingAddress,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Payment intent creation failed:', errorData)
        throw new Error(errorData.error || 'Failed to create payment intent')
      }

      const data = await response.json()
      
      console.log('✅ Payment intent created:', {
        paymentIntentId: data.paymentIntentId,
        clientSecret: data.clientSecret ? '***' : 'missing',
      })
      
      // Redirect to checkout page with payment intent
      const checkoutUrl = `/checkout?listingId=${encodeURIComponent(listing.id)}&paymentIntentId=${encodeURIComponent(data.paymentIntentId)}`
      window.location.href = checkoutUrl
      
    } catch (error) {
      console.error('💥 Marketplace checkout failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to start checkout. Please try again.'
      alert(`❌ ${errorMessage}`)
    } finally {
      setIsOrdering(false)
    }
  }

  const handleCryptoPaymentSelected = async (address: ShippingAddress) => {
    if (!listing) return
    
    setIsOrdering(true)
    
    try {
      console.log('🪙 Creating crypto payment...', {
        listingId: listing.id,
        quantity,
        shippingAddress: address,
      })
      
      // Validate address fields
      console.log('🔍 Address validation:', {
        hasEmail: !!address.email,
        hasName: !!address.name,
        hasLine1: !!address.line1,
        hasCity: !!address.city,
        hasState: !!address.state,
        hasPostalCode: !!address.postal_code,
        hasCountry: !!address.country,
        fullAddress: address
      })
      
      // Create crypto payment
      const response = await csrfFetch('/api/crypto-payment', {
        method: 'POST',
        body: JSON.stringify({ 
          listingId: listing.id,
          quantity,
          includeDisplayCase,
          displayCaseQuantity,
          cardFinish,
          shippingAddress: address,
          orderItems: `${listing.title} (${quantity}x)`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Crypto payment creation failed:', errorData)
        throw new Error(errorData.error || 'Failed to create crypto payment')
      }

      const data = await response.json()
      
      console.log('✅ Crypto payment created:', {
        transactionId: data.transactionId,
        amount: data.amount,
      })
      
      // Show crypto payment modal
      console.log('🪙 Setting crypto payment modal data:', data)
      setCryptoPaymentData(data)
      // Use setTimeout to ensure state updates in correct order
      setTimeout(() => {
        setShowCryptoPaymentModal(true)
        console.log('🪙 Crypto payment modal should now be visible')
      }, 100)
      
    } catch (error) {
      console.error('💥 Crypto payment failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create crypto payment. Please try again.'
      alert(`❌ ${errorMessage}`)
    } finally {
      setIsOrdering(false)
    }
  }

  // Don't render if modal is not visible or no listing
  if (!isVisible || !listing) return null

  // Render shipping form
  if (currentStep === 'shipping') {
    return (
      <div className="fixed inset-0 z-[100] stripe-styled-form-wrapper">
        <div 
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <div className="relative h-full flex items-start sm:items-center justify-center overflow-y-auto p-4">
          <div className="w-full max-w-2xl py-4 sm:py-8">
            <div className="relative bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white shadow-lg hover:shadow-xl transition-shadow"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
              </button>
              <StripeStyledShippingForm
                onSubmit={handleShippingSubmit}
                onBack={handleBackToQuantity}
                isSubmitting={isOrdering}
                subtotal={currentPricing.totalPrice}
                orderType="marketplace"
                orderDetails={{
                  listingId: listing.id,
                  cardFinish: cardFinish,
                  includeDisplayCase: includeDisplayCase,
                  displayCaseQuantity: displayCaseQuantity
                }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`fixed inset-0 z-[100] font-mono transition-all duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Overlay Background */}
      <div 
        className={`absolute inset-0 bg-cyber-black/80 backdrop-blur-sm transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`} 
        onClick={handleOverlayClick}
      />
      
      {/* Animated Grid Background */}
      <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
      
      {/* Scanlines Effect - Disabled on mobile for performance */}
      {!isSmallScreen && <div className="absolute inset-0 scanlines opacity-20 pointer-events-none" />}

      {/* Modal Content */}
      <div 
        className="relative h-full flex items-start sm:items-center justify-center overflow-y-auto"
        onClick={handleOverlayClick}
      >
        <div className={`w-full max-w-6xl px-4 py-4 sm:py-8 lg:py-4 my-auto transition-all duration-300 transform ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}>
          <Card 
            className="w-full bg-cyber-dark/60 backdrop-blur-sm border-2 border-cyber-cyan/30 cyber-card-glow-gradient overflow-hidden relative"
            onClick={handleModalClick}
          >
            {/* Cyberpunk Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose?.()
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-1.5 sm:p-2 rounded-md border border-cyber-cyan/50 bg-cyber-dark/80 backdrop-blur-sm 
                         text-cyber-cyan hover:bg-cyber-cyan/10 hover:border-cyber-cyan hover:shadow-lg hover:shadow-cyber-cyan/20
                         transition-all duration-200 group"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
            
            <CardContent className="p-0">
              {/* Header - Mobile-only reduced spacing */}
              <div className="text-center py-3 sm:py-4 px-4 border-b border-cyber-cyan/20">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Star className="hidden sm:block w-5 h-5 text-cyber-purple animate-pulse" />
                  <h1 
                    id="modal-title"
                    className="text-lg sm:text-2xl lg:text-3xl font-bold text-white tracking-wider glitch max-w-[220px] sm:max-w-none" 
                    data-text="Purchase from Marketplace"
                  >
                    Purchase from Marketplace
                  </h1>
                  <Star className="hidden sm:block w-5 h-5 text-cyber-purple animate-pulse" />
                </div>
                <h2 className="text-base sm:text-xl lg:text-2xl font-bold mb-1 bg-[linear-gradient(45deg,#00ffff_0%,#ff0080_25%,#00ff41_50%,#8a2be2_75%,#00ffff_100%)] bg-clip-text text-transparent bg-[length:400%_400%] bg-[position:0%_50%] sm:[animation:holographic-shift_3s_ease-in-out_infinite] max-w-md mx-auto text-center">
                  {listing?.title || 'Loading...'}
                </h2>
              </div>

              {/* Main Content - Mobile-only reduced spacing */}
              <div className="p-3 sm:p-4">
                {currentStep === 'quantity' ? (
                  <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
                  {/* Left Side - Card Preview */}
                  <div className="flex justify-center order-1 lg:order-1">
                    <div className="relative w-full max-w-[200px] sm:max-w-xs lg:max-w-sm">
                      {/* 2D Card Preview - Natural Position */}
                      <div 
                        className={`relative z-20 transition-opacity duration-600 ease-in-out ${
                          fadeTransition.isTransitioning && fadeTransition.show3D
                            ? 'opacity-0' 
                            : showCase3DPreview 
                              ? 'opacity-0' 
                              : 'opacity-100'
                        }`}
                      >
                        <MarketplaceCardPreview 
                          key={`2d-preview-${listing?.image_url || 'placeholder'}`} 
                          imageUrl={listing?.image_url || null} 
                          cardFinish={cardFinish}
                          title={listing?.title || ''}
                        />
                      </div>
                      
                      {/* 3D Card Preview - Conditionally rendered for proper unmounting */}
                      {showCase3DPreview && (
                        <div 
                          className={`absolute inset-0 z-10 transition-opacity duration-600 ease-in-out ${
                            fadeTransition.isTransitioning && fadeTransition.show3D
                              ? 'opacity-100' 
                              : 'opacity-100'
                          }`}
                        >
                          <CustomCard3DPreviewWrapper
                            key={`3d-preview-${listing?.image_url || 'placeholder'}-${animationKey}`}
                            animationKey={animationKey}
                            cardFrontImage={listing?.image_url || "/placeholder.jpg"}
                            cardBackImage="/card_back_cardifyCUnetnoise_scaleLevel3x2.0000001_211.jpg"
                            showCase={true}
                            caseModelPath="/card-slab-3d-custom.glb"
                          />
                        </div>
                      )}
                      
                      {/* Subtle glow effect behind card */}
                      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-cyber-purple/10 via-cyber-pink/10 to-cyber-cyan/10 blur-2xl scale-105 opacity-60" />
                    </div>
                  </div>

                  {/* Right Side - Order Controls */}
                  <div className="flex justify-center lg:items-center order-2 lg:order-2">
                    <div className="w-full max-w-sm space-y-3 sm:space-y-4 lg:space-y-5">
                      {/* Quantity Selector - Improved mobile sizing */}
                      <div className="space-y-2">
                        <Label htmlFor="quantity" className="text-sm sm:text-base font-bold text-cyber-cyan tracking-wider">
                          Quantity
                        </Label>
                        <div className="flex items-center gap-3">
                          <Button
                            ref={firstFocusableRef}
                            variant="outline"
                            size="icon"
                            onClick={() => setQuantity(Math.max(QUANTITY_CONFIG.MIN, quantity - 1))}
                            disabled={quantity <= QUANTITY_CONFIG.MIN}
                            className={`h-8 w-8 sm:h-10 sm:w-10 lg:h-8 lg:w-8 bg-cyber-dark/80 border-cyber-cyan/50 text-cyber-cyan ${
                              quantity <= QUANTITY_CONFIG.MIN
                                ? 'opacity-30 cursor-not-allowed' 
                                : 'hover:bg-cyber-cyan/10 hover:border-cyber-cyan hover:text-cyber-cyan'
                            }`}
                            aria-label={`Decrease quantity${quantity <= QUANTITY_CONFIG.MIN ? ' (at minimum)' : ''}`}
                            title={quantity <= QUANTITY_CONFIG.MIN ? `Minimum quantity is ${QUANTITY_CONFIG.MIN}` : 'Decrease quantity'}
                          >
                            <Minus className="w-3 h-3 sm:w-4 sm:h-4 lg:w-3 lg:h-3" />
                          </Button>
                          
                          <Input
                            id="quantity"
                            type="number"
                            min="1"
                            max={QUANTITY_CONFIG.MAX}
                            value={quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1
                              setQuantity(Math.min(QUANTITY_CONFIG.MAX, Math.max(QUANTITY_CONFIG.MIN, val)))
                            }}
                            onKeyDown={(e) => {
                              // Prevent typing invalid characters
                              if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-' || e.key === '.') {
                                e.preventDefault()
                              }
                            }}
                            onFocus={(e) => {
                              // Select all text when input is focused for easy replacement
                              e.target.select()
                            }}
                            className="w-16 h-8 sm:w-20 sm:h-10 lg:w-16 lg:h-8 text-center bg-cyber-dark/80 border-cyber-cyan/50 text-white focus:border-cyber-cyan text-sm sm:text-base lg:text-sm font-bold"
                            aria-label={`Quantity (current: ${quantity}, max: ${QUANTITY_CONFIG.MAX})`}
                          />
                          
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setQuantity(Math.min(QUANTITY_CONFIG.MAX, quantity + 1))}
                            disabled={quantity >= QUANTITY_CONFIG.MAX}
                            className={`h-8 w-8 sm:h-10 sm:w-10 lg:h-8 lg:w-8 bg-cyber-dark/80 border-cyber-cyan/50 text-cyber-cyan ${
                              quantity >= QUANTITY_CONFIG.MAX
                                ? 'opacity-30 cursor-not-allowed' 
                                : 'hover:bg-cyber-cyan/10 hover:border-cyber-cyan hover:text-cyber-cyan'
                            }`}
                            aria-label={`Increase quantity${quantity >= QUANTITY_CONFIG.MAX ? ' (at maximum)' : ''}`}
                            title={quantity >= QUANTITY_CONFIG.MAX ? `Maximum quantity is ${QUANTITY_CONFIG.MAX}` : 'Increase quantity'}
                          >
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4 lg:w-3 lg:h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Card Finish Selection */}
                      <div className="space-y-2">
                        <Label htmlFor="card-finish" className="text-sm sm:text-base font-bold text-cyber-cyan tracking-wider">
                          Card Finish
                        </Label>
                        <Select value={cardFinish} onValueChange={(value) => setCardFinish(value as 'matte' | 'rainbow' | 'gloss')}>
                          <SelectTrigger className="bg-cyber-dark/80 border-cyber-cyan/50 text-white focus:border-cyber-cyan">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-cyber-dark border-cyber-cyan/30 max-w-[--radix-select-trigger-width] [&>[data-radix-select-viewport]]:pr-1.5 z-[200]">
                            <SelectItem 
                              value="matte"
                              className="text-white hover:bg-cyber-cyan/20 hover:text-white focus:bg-cyber-cyan/20 focus:text-white data-[state=checked]:bg-cyber-cyan/20 data-[state=checked]:text-white rounded-md !pr-6 mb-1"
                            >
                              Matte Finish
                            </SelectItem>
                            <SelectItem 
                              value="rainbow"
                              className="text-white hover:bg-cyber-cyan/20 hover:text-white focus:bg-cyber-cyan/20 focus:text-white data-[state=checked]:bg-cyber-cyan/20 data-[state=checked]:text-white rounded-md !pr-6 mb-1"
                            >
                              Rainbow Foil (+$4.00)
                            </SelectItem>
                            <SelectItem 
                              value="gloss"
                              className="text-white hover:bg-cyber-cyan/20 hover:text-white focus:bg-cyber-cyan/20 focus:text-white data-[state=checked]:bg-cyber-cyan/20 data-[state=checked]:text-white rounded-md !pr-6"
                            >
                              High Gloss (+$4.00)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Display Case Option */}
                      <div className="space-y-2">
                        <div 
                          className="space-y-0.5"
                          onMouseEnter={handleShow3DPreview}
                          onMouseLeave={handleHide3DPreview}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="display-case-option"
                              checked={includeDisplayCase}
                              onChange={(e) => {
                                setIncludeDisplayCase(e.target.checked)
                                if (e.target.checked) {
                                  setDisplayCaseQuantity(Math.min(quantity, displayCaseQuantity))
                                  // Show 3D case and activate mobile preview mode
                                  setShowCase3DPreview(true)
                                  setMobilePreviewActive(true)
                                } else {
                                  // Reset mobile preview when display case is unchecked
                                  if (mobilePreviewActive) {
                                    setMobilePreviewActive(false)
                                    setShowCase3DPreview(false)
                                    setFadeTransition({ isTransitioning: false, show3D: false })
                                  }
                                }
                              }}
                              className="h-4 w-4 text-cyber-cyan focus:ring-cyber-cyan focus:ring-2 border-cyber-cyan/50 rounded bg-cyber-dark/80 checked:bg-cyber-cyan checked:border-cyber-cyan cursor-pointer"
                              aria-label="Add display case option"
                            />
                            <label htmlFor="display-case-option" className="text-base font-bold text-cyber-cyan tracking-wider cursor-pointer hover:text-cyber-purple">
                              Add acrylic display case(s)
                            </label>
                          </div>
                          <div className="ml-0 mt-5">
                            <span 
                              className="cursor-pointer flex items-center text-sm font-semibold gap-3 py-2"
                              onClick={isMobile ? handleMobilePreviewTap : undefined}
                            >
                              {isMobile ? (
                                <>
                                  {mobilePreviewActive ? (
                                    <EyeOff className="w-4 h-4 text-cyber-cyan" />
                                  ) : (
                                    <Eye className="w-4 h-4 text-cyber-cyan" />
                                  )}
                                  <span className="bg-[linear-gradient(45deg,#00ffff_0%,#ff0080_25%,#00ff41_50%,#8a2be2_75%,#00ffff_100%)] bg-clip-text text-transparent bg-[length:400%_400%] bg-[position:0%_50%] sm:[animation:holographic-shift_3s_ease-in-out_infinite]">
                                    {mobilePreviewActive ? "Tap to hide display case" : "Tap to preview display case"}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 text-cyber-cyan" />
                                  <span className="bg-[linear-gradient(45deg,#00ffff_0%,#ff0080_25%,#00ff41_50%,#8a2be2_75%,#00ffff_100%)] bg-clip-text text-transparent bg-[length:400%_400%] bg-[position:0%_50%] sm:[animation:holographic-shift_3s_ease-in-out_infinite]">
                                    Hover to preview display case
                                  </span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                        
                        {includeDisplayCase && (
                          <div className="pl-6 space-y-2">
                            <div className="flex items-center justify-between">
                              <label htmlFor="display-case-quantity" className="text-xs text-cyber-cyan/80">
                                Display Cases:
                              </label>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setDisplayCaseQuantity(Math.max(1, displayCaseQuantity - 1))}
                                  disabled={displayCaseQuantity <= 1}
                                  className="h-6 w-6 bg-cyber-dark/80 border-cyber-cyan/50 text-cyber-cyan hover:bg-cyber-cyan/10 hover:border-cyber-cyan hover:text-cyber-cyan disabled:opacity-30"
                                  aria-label="Decrease display case quantity"
                                >
                                  <Minus className="w-2 h-2" />
                                </Button>
                                
                                <span className="px-2 py-1 text-cyber-cyan font-bold min-w-[2rem] text-center text-sm">
                                  {displayCaseQuantity}
                                </span>
                                
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setDisplayCaseQuantity(Math.min(quantity, displayCaseQuantity + 1))}
                                  disabled={displayCaseQuantity >= quantity}
                                  className="h-6 w-6 bg-cyber-dark/80 border-cyber-cyan/50 text-cyber-cyan hover:bg-cyber-cyan/10 hover:border-cyber-cyan hover:text-cyber-cyan disabled:opacity-30"
                                  aria-label="Increase display case quantity"
                                >
                                  <Plus className="w-2 h-2" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-xs text-cyber-purple/80">
                              ${(19.00 * displayCaseQuantity).toFixed(2)} ({displayCaseQuantity} × $19.00 each)
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Price Display - Better mobile formatting with bulk discounts */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm sm:text-base">
                          <span className="text-gray-300">Price per card:</span>
                          <div className="text-right">
                            <span className="text-cyber-green font-bold">${currentPricing.pricePerUnit.toFixed(2)}</span>
                            {currentPricing.discount > 0 && (
                              <div className="text-xs text-cyber-pink">
                                {currentPricing.discount}% off!
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {currentPricing.savings > 0 && (
                          <div className="flex justify-between items-center text-sm text-cyber-pink">
                            <span>Bulk discount:</span>
                            <span className="font-bold">-${currentPricing.savings.toFixed(2)}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center text-base sm:text-lg border-t border-cyber-cyan/20 pt-2">
                          <span className="text-white font-bold">Total:</span>
                          <span className="text-cyber-green font-bold text-lg sm:text-xl neon-green">${currentPricing.totalPrice.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Bulk Discount Tiers Display */}
                      <div className="text-xs text-gray-400 bg-cyber-dark/40 rounded-lg p-2 space-y-1">
                        <p className="font-semibold text-cyber-cyan">💰 Bulk Discounts:</p>
                        <div className="flex justify-between">
                          <span>2+ cards:</span>
                          <span className="text-cyber-purple">
                            25% off (${((currentPricing.basePriceWithFinish || 0) * 0.75).toFixed(2)}/card)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>5+ cards:</span>
                          <span className="text-cyber-purple">
                            35% off (${((currentPricing.basePriceWithFinish || 0) * 0.65).toFixed(2)}/card)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>10+ cards:</span>
                          <span className="text-cyber-purple">
                            50% off (${((currentPricing.basePriceWithFinish || 0) * 0.50).toFixed(2)}/card)
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons - matching custom-card-checkout-modal style */}
                      {showAddedToCart ? (
                        <div className="w-full px-4 py-3 sm:py-4 text-base font-bold tracking-wider bg-cyber-green/20 border-2 border-cyber-green text-cyber-green rounded-lg flex items-center justify-center">
                          <Star className="w-5 h-5 sm:w-4 sm:h-4 mr-2 sm:animate-pulse" />
                          Added to Cart!
                          <Star className="w-5 h-5 sm:w-4 sm:h-4 ml-2 sm:animate-pulse" />
                        </div>
                      ) : (
                        <div className="flex flex-col lg:flex-row gap-3">
                          <Button
                            size="lg"
                            onClick={handleAddToCart}
                            disabled={isOrdering || !listing}
                            className="flex-1 lg:flex-[0.8] px-4 py-3 sm:py-4 text-base font-bold tracking-wider bg-cyber-dark/90 border-2 border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-cyber-dark hover:shadow-[0_0_20px_rgba(57,255,20,0.5)] hover:border-cyber-green transition-all duration-300 disabled:opacity-50 disabled:hover:bg-cyber-dark/90 disabled:hover:text-cyber-green disabled:hover:shadow-none"
                          >
                            <ShoppingBag className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                            Add to Cart
                          </Button>
                          
                          <Button
                            ref={lastFocusableRef}
                            size="lg"
                            onClick={handleContinueToShipping}
                            disabled={isOrdering || !listing}
                            className="flex-1 lg:flex-[1.2] px-4 py-3 sm:py-4 text-lg font-bold tracking-wider cyber-button sm:animate-pulse disabled:opacity-50"
                          >
                            <ShoppingCart className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                            {isOrdering ? 'Processing...' : 'Buy Now'}
                            <Star className="w-5 h-5 sm:w-4 sm:h-4 ml-2 sm:animate-pulse" />
                          </Button>
                        </div>
                      )}

                      {/* Seller Notice */}
                      <p className="text-xs text-gray-400 text-center">
                        This listing is fulfilled and shipped by Cardify. The seller will receive payment after successful delivery.
                      </p>
                    </div>
                  </div>
                  </div>
                ) : null}
              </div>

              {/* Branding Section - Mobile-only reduced spacing */}
              <div className="text-center py-2 sm:py-3 px-4 border-t border-cyber-cyan/20 bg-cyber-dark/20">
                <div className="flex items-center justify-center">
                  <img 
                    src="/cardify-currentcolor_svg.svg" 
                    alt="Cardify" 
                    className="w-auto opacity-80 sm:animate-pulse sm:[animation:neonCycle_8s_ease-in-out_infinite]"
                    style={{ 
                      height: '1rem',
                      color: '#00ffff',
                      filter: 'drop-shadow(0 0 8px currentColor)'
                    }}
                  />
                  <style jsx>{`
                    @keyframes neonCycle {
                      0% { color: #00ffff; }
                      16.66% { color: #ff00ff; }
                      33.33% { color: #ffff00; }
                      50% { color: #00ff00; }
                      66.66% { color: #ff6600; }
                      83.33% { color: #6600ff; }
                      100% { color: #00ffff; }
                    }
                  `}</style>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Method Selection is now integrated into the shipping form */}

      {/* Crypto Payment Modal */}
      <CryptoPaymentModal
        isOpen={showCryptoPaymentModal}
        onClose={() => setShowCryptoPaymentModal(false)}
        paymentData={cryptoPaymentData}
      />
    </div>
  )
}
