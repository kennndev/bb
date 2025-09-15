import { loadStripe, Stripe } from '@stripe/stripe-js';

// Get the publishable key from environment variables
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Validate that the publishable key is present
if (!stripePublishableKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable. Please add it to your .env file.'
  );
}

// Create a singleton promise for Stripe.js
// This ensures Stripe.js is only loaded once across the application
let _stripePromise: Promise<Stripe | null>;

export const getStripe = (): Promise<Stripe | null> => {
  if (!_stripePromise) {
    _stripePromise = loadStripe(stripePublishableKey);
  }
  return _stripePromise;
};

// Export the promise directly for use with Elements provider
export const stripePromise = getStripe();

// Export the publishable key for reference
export const STRIPE_PUBLISHABLE_KEY = stripePublishableKey; 