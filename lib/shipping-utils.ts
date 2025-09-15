/**
 * Shared shipping utilities for consistent shipping cost calculation
 * Used by both Stripe checkout and crypto payments
 */

export interface ShippingOption {
  amount: number; // in cents
  displayName: string;
  deliveryEstimate: {
    minimum: { unit: 'business_day'; value: number };
    maximum: { unit: 'business_day'; value: number };
  };
}

/**
 * Get shipping cost in cents based on country
 * This matches the shipping costs used in Stripe checkout
 */
export function getShippingCostForCountry(country: string): number {
  if (country === 'US') return 499; // $4.99 in cents
  if (country === 'CA') return 1199; // $11.99 in cents
  return 1699; // $16.99 in cents for international
}

/**
 * Get full shipping option details (used by Stripe checkout)
 */
export function getShippingOptionForCountry(country: string): ShippingOption {
  // US Shipping
  if (country === 'US') {
    return {
      amount: 499, // $4.99 in cents
      displayName: 'Standard Shipping',
      deliveryEstimate: {
        minimum: { unit: 'business_day', value: 5 },
        maximum: { unit: 'business_day', value: 7 },
      },
    };
  }
  
  // Canada Shipping
  if (country === 'CA') {
    return {
      amount: 1199, // $11.99 in cents
      displayName: 'Standard Shipping',
      deliveryEstimate: {
        minimum: { unit: 'business_day', value: 7 },
        maximum: { unit: 'business_day', value: 14 },
      },
    };
  }
  
  // International Shipping (all other countries)
  return {
    amount: 1699, // $16.99 in cents
    displayName: 'International Shipping',
    deliveryEstimate: {
      minimum: { unit: 'business_day', value: 10 },
      maximum: { unit: 'business_day', value: 21 },
    },
  };
}

/**
 * Get shipping cost in dollars (for display purposes)
 */
export function getShippingCostInDollars(country: string): number {
  return getShippingCostForCountry(country) / 100;
}
