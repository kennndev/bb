-- Create crypto_payments table to store crypto payment information
-- This table stores the exact data format shown in the user's images

CREATE TABLE IF NOT EXISTS crypto_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Transaction identification
  transaction_id TEXT UNIQUE NOT NULL,
  transaction_hash TEXT,
  
  -- User and listing information
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL,
  
  -- Payment amounts (in cents)
  amount_cents INTEGER NOT NULL,
  base_amount_cents INTEGER NOT NULL DEFAULT 900, -- $9.00 base amount
  tax_amount_cents INTEGER NOT NULL DEFAULT 0,
  tax_rate_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Payment status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'confirmed', 'failed', 'cancelled')),
  
  -- Crypto details
  receiving_address TEXT NOT NULL,
  
  -- EXACT COLUMNS FROM USER'S IMAGE:
  -- Company information
  company TEXT,
  
  -- Address information (matching the image format)
  address TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zipcode TEXT NOT NULL,
  country TEXT NOT NULL,
  
  -- Order identification
  order_id TEXT UNIQUE NOT NULL, -- This will be the main order identifier
  
  -- Order details
  order_items TEXT,
  quantity INTEGER DEFAULT 1,
  include_display_case BOOLEAN DEFAULT FALSE,
  display_case_quantity INTEGER DEFAULT 1,
  card_finish TEXT DEFAULT 'matte',
  
  -- Package dimensions (to be filled later by staff - matching image columns)
  pounds DECIMAL(8,2),
  length DECIMAL(8,2),
  width DECIMAL(8,2),
  height DECIMAL(8,2),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT valid_amount CHECK (amount_cents > 0),
  CONSTRAINT valid_base_amount CHECK (base_amount_cents > 0),
  CONSTRAINT valid_tax_amount CHECK (tax_amount_cents >= 0),
  CONSTRAINT valid_tax_rate CHECK (tax_rate_percentage >= 0 AND tax_rate_percentage <= 100)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_crypto_payments_buyer_id ON crypto_payments(buyer_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_listing_id ON crypto_payments(listing_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_status ON crypto_payments(status);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_created_at ON crypto_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_transaction_id ON crypto_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_transaction_hash ON crypto_payments(transaction_hash);

-- Add RLS policies
ALTER TABLE crypto_payments ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own payments
CREATE POLICY "Users can view their own crypto payments" ON crypto_payments
  FOR SELECT USING (auth.uid() = buyer_id);

-- Policy for users to insert their own payments
CREATE POLICY "Users can create crypto payments" ON crypto_payments
  FOR INSERT WITH CHECK (auth.uid() = buyer_id OR buyer_id IS NULL);

-- Policy for service role to manage all payments
CREATE POLICY "Service role can manage all crypto payments" ON crypto_payments
  FOR ALL USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE crypto_payments IS 'Stores crypto payment transactions with tax calculation and shipping information';
COMMENT ON COLUMN crypto_payments.transaction_id IS 'Unique identifier for the crypto payment transaction';
COMMENT ON COLUMN crypto_payments.transaction_hash IS 'Blockchain transaction hash (filled after user submits)';
COMMENT ON COLUMN crypto_payments.base_amount_cents IS 'Base payment amount in cents ($9.00 = 900 cents)';
COMMENT ON COLUMN crypto_payments.tax_amount_cents IS 'Calculated tax amount in cents';
COMMENT ON COLUMN crypto_payments.tax_rate_percentage IS 'Tax rate percentage (e.g., 20.00 for 20%)';
COMMENT ON COLUMN crypto_payments.receiving_address IS 'Crypto address to receive payments';
COMMENT ON COLUMN crypto_payments.address IS 'Customer shipping address';
COMMENT ON COLUMN crypto_payments.pounds IS 'Package weight in pounds (filled by staff later)';
COMMENT ON COLUMN crypto_payments.length IS 'Package length in inches (filled by staff later)';
COMMENT ON COLUMN crypto_payments.width IS 'Package width in inches (filled by staff later)';
COMMENT ON COLUMN crypto_payments.height IS 'Package height in inches (filled by staff later)';

