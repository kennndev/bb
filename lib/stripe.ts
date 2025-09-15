import Stripe from 'stripe';

// Validate that the secret key is present
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error(
    'Missing STRIPE_SECRET_KEY environment variable. Please add it to your .env file.'
  );
}

// Initialize Stripe with the latest API version
// Using singleton pattern to avoid re-initializing on every import
export const stripe = new Stripe(stripeSecretKey, {
  typescript: true, // Enable TypeScript support
  // Let Stripe use its default API version
});

// Helper function to validate Stripe connection
export async function validateStripeConnection(): Promise<boolean> {
  try {
    // Make a simple API call to verify the connection
    const account = await stripe.accounts.retrieve();
    console.log('✅ Stripe connection successful. Account ID:', account.id);
    return true;
  } catch (error) {
    console.error('❌ Stripe connection failed:', error);
    return false;
  }
} 