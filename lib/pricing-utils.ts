export interface PricingTier {
  quantity: number
  pricePerUnit: number
  discount: number
}

interface ProductPricing {
  basePricePerUnit: number
  pricingTiers: PricingTier[]
}

const PRICING_CONFIG: Record<string, ProductPricing> = {
  'limited-edition': {
    basePricePerUnit: 49.00,
    pricingTiers: [
      { quantity: 1, pricePerUnit: 49.00, discount: 0 },
      { quantity: 5, pricePerUnit: 46.55, discount: 5 },
      { quantity: 10, pricePerUnit: 44.10, discount: 10 },
      { quantity: 25, pricePerUnit: 41.65, discount: 15 },
    ]
  },
  'custom-card': {
    basePricePerUnit: 9.00,
    pricingTiers: [
      { quantity: 1, pricePerUnit: 9.00, discount: 0 },
      { quantity: 2, pricePerUnit: 6.75, discount: 25 },
      { quantity: 5, pricePerUnit: 5.85, discount: 35 },
      { quantity: 10, pricePerUnit: 4.50, discount: 50 },
    ]
  },
  'marketplace': {
    basePricePerUnit: 0,
    pricingTiers: [
      { quantity: 1, pricePerUnit: 0, discount: 0 },
      { quantity: 2, pricePerUnit: 0, discount: 25 },  // 25% off for 2+
      { quantity: 5, pricePerUnit: 0, discount: 35 },  // 35% off for 5+
      { quantity: 10, pricePerUnit: 0, discount: 50 }, // 50% off for 10+
    ]
  }
}

export function calculateDiscountedPrice(
  productType: 'limited-edition' | 'custom-card' | 'marketplace',
  quantity: number,
  basePrice?: number
): { pricePerUnit: number; discount: number; totalPrice: number } {
  
  if (productType === 'marketplace') {
    const pricing = PRICING_CONFIG[productType]
    const basePricePerUnit = basePrice || 0
    
    // Find applicable discount tier for marketplace items
    const applicableTiers = pricing.pricingTiers.filter(
      tier => quantity >= tier.quantity
    )
    
    const bestTier = applicableTiers.length > 0 
      ? applicableTiers[applicableTiers.length - 1]
      : { discount: 0 }
    
    // Apply percentage discount to the marketplace price
    const pricePerUnit = basePricePerUnit * (1 - bestTier.discount / 100)
    
    return {
      pricePerUnit,
      discount: bestTier.discount,
      totalPrice: pricePerUnit * quantity
    }
  }

  const pricing = PRICING_CONFIG[productType]
  if (!pricing) {
    const pricePerUnit = basePrice || 0
    return {
      pricePerUnit,
      discount: 0,
      totalPrice: pricePerUnit * quantity
    }
  }

  const applicableTiers = pricing.pricingTiers.filter(
    tier => quantity >= tier.quantity
  )
  
  const bestTier = applicableTiers.length > 0 
    ? applicableTiers[applicableTiers.length - 1]
    : pricing.pricingTiers[0]

  const pricePerUnit = basePrice ? 
    basePrice * (1 - bestTier.discount / 100) : 
    bestTier.pricePerUnit
  
  return {
    pricePerUnit,
    discount: bestTier.discount,
    totalPrice: pricePerUnit * quantity
  }
}

export function getDiscountTiers(productType: 'limited-edition' | 'custom-card' | 'marketplace'): PricingTier[] {
  return PRICING_CONFIG[productType]?.pricingTiers || []
}

export function getNextDiscountTier(
  productType: 'limited-edition' | 'custom-card' | 'marketplace',
  currentQuantity: number
): PricingTier | null {
  const tiers = PRICING_CONFIG[productType]?.pricingTiers || []
  const nextTier = tiers.find(tier => tier.quantity > currentQuantity)
  return nextTier || null
}