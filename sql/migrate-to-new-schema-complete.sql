-- =====================================================
-- CARDIFY COMPLETE DATABASE MIGRATION - MASTER SCRIPT
-- This script runs all 6 parts of the migration in sequence
-- Run this in your new Supabase database to set up everything
-- =====================================================

-- =====================================================
-- EXECUTION INSTRUCTIONS
-- =====================================================

/*
IMPORTANT: Run this script in your Supabase SQL editor in this exact order:

1. First, run this master script which will execute all parts
2. Or run each part individually in sequence:
   - migrate-to-new-schema-part1-schema.sql
   - migrate-to-new-schema-part2-functions.sql
   - migrate-to-new-schema-part3-triggers.sql
   - migrate-to-new-schema-part4-rls.sql
   - migrate-to-new-schema-part5-storage.sql
   - migrate-to-new-schema-part6-finalize.sql

This will create a complete Cardify database with:
- All tables and indexes
- All functions and triggers
- All RLS policies
- All storage buckets and policies
- Realtime subscriptions
- Materialized views
- Complete verification

After running this, your database will be ready for the Cardify application!
*/

-- =====================================================
-- PART 1: SCHEMA
-- =====================================================

\echo 'Starting Part 1: Database Schema...'

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT UNIQUE,
    avatar_url TEXT,
    credits INTEGER DEFAULT 0 NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    upload_count INTEGER DEFAULT 0,
    upload_package_count INTEGER DEFAULT 0,
    free_generations_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ADMINS TABLE
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id),
    UNIQUE(email)
);

-- UPLOADED IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.uploaded_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    original_filename TEXT NOT NULL,
    title TEXT,
    description TEXT,
    storage_path TEXT NOT NULL,
    image_url TEXT NOT NULL,
    mime_type TEXT,
    file_size_bytes BIGINT,
    metadata JSONB DEFAULT '{}',
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of UUID REFERENCES public.uploaded_images(id),
    duplicate_score DECIMAL(5,4),
    approved BOOLEAN DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GENERATED IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.generated_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    prompt TEXT,
    storage_path TEXT NOT NULL,
    image_url TEXT NOT NULL,
    mime_type TEXT,
    file_size_bytes BIGINT,
    generation_params JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USER ASSETS TABLE (unified view of uploaded and generated images)
CREATE TABLE IF NOT EXISTS public.user_assets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('uploaded', 'generated')),
    source_id UUID NOT NULL,
    title TEXT,
    description TEXT,
    image_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    file_size_bytes BIGINT,
    is_public BOOLEAN DEFAULT FALSE,
    is_listed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(asset_type, source_id)
);

-- DUPLICATE DETECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.duplicate_detections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    asset_id UUID NOT NULL,
    user_id UUID NOT NULL,
    similarity_score DECIMAL(5,4) NOT NULL,
    matched_asset_id UUID,
    matched_user_id UUID,
    detection_method TEXT DEFAULT 'lpips',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MARKETPLACE LISTINGS TABLE
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    asset_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'inactive', 'cancelled')),
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    sold_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MARKETPLACE TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.marketplace_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE CASCADE NOT NULL,
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    stripe_payment_intent_id TEXT,
    platform_fee_cents INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    payment_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    credited_at TIMESTAMP WITH TIME ZONE
);

-- ASSET BUYERS TABLE (tracks who bought what)
CREATE TABLE IF NOT EXISTS public.asset_buyers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    asset_id UUID NOT NULL,
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE CASCADE NOT NULL,
    transaction_id UUID REFERENCES public.marketplace_transactions(id) ON DELETE CASCADE NOT NULL,
    purchase_amount_cents INTEGER NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revenue_status TEXT DEFAULT 'available' CHECK (revenue_status IN ('available', 'payment_requested', 'credited')),
    revenue_request_id UUID
);

-- REVENUE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.revenue_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    request_type TEXT NOT NULL CHECK (request_type IN ('revenue_conversion', 'stripe_payment')),
    contact_info JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'processed')),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- CREDITS LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.credits_ledger (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reference_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- UPLOAD PACKAGES TABLE
CREATE TABLE IF NOT EXISTS public.upload_packages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    package_size INTEGER NOT NULL DEFAULT 10,
    credits_spent INTEGER NOT NULL,
    uploads_used INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CUSTOM CARD ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.custom_card_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    customer_email TEXT NOT NULL,
    image_url TEXT NOT NULL,
    card_finish TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    stripe_session_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    shipping_address JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GUEST QUOTAS TABLE (for non-authenticated users)
CREATE TABLE IF NOT EXISTS public.guest_quotas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- APP EVENTS TABLE (analytics)
CREATE TABLE IF NOT EXISTS public.app_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id TEXT,
    session_id TEXT,
    page TEXT,
    event_name TEXT NOT NULL,
    properties JSONB DEFAULT '{}',
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ASSET VIEWS TABLE (tracking)
CREATE TABLE IF NOT EXISTS public.asset_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    asset_id UUID NOT NULL,
    viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USER ACTIVITY TABLE
CREATE TABLE IF NOT EXISTS public.user_activity (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL,
    asset_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REVENUE TRACKING TABLE
CREATE TABLE IF NOT EXISTS public.revenue_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    asset_buyer_id UUID REFERENCES public.asset_buyers(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    revenue_status TEXT DEFAULT 'available' CHECK (revenue_status IN ('available', 'payment_requested', 'credited')),
    revenue_request_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STRIPE EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.stripe_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    account TEXT,
    created BIGINT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payload JSONB
);

-- WEBHOOK EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create essential indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_uploaded_images_user_id ON public.uploaded_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON public.generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_user_assets_user_id ON public.user_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_id ON public.marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer_id ON public.marketplace_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_seller_id ON public.marketplace_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_credits_ledger_user_id ON public.credits_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_requests_user_id ON public.revenue_requests(user_id);

\echo 'Part 1 Complete: Database Schema created!'

-- =====================================================
-- PART 2: FUNCTIONS
-- =====================================================

\echo 'Starting Part 2: Functions...'

-- Core utility functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_user_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admins 
        WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Credit system functions
CREATE OR REPLACE FUNCTION add_credits(
    p_user_id UUID, 
    p_amount INTEGER, 
    p_reason TEXT, 
    p_reference_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles 
    SET credits = credits + p_amount,
        updated_at = now()
    WHERE id = p_user_id;
    
    INSERT INTO public.credits_ledger (user_id, amount, reason, reference_id)
    VALUES (p_user_id, p_amount, p_reason, p_reference_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION spend_credits(
    p_user_id UUID, 
    p_amount INTEGER, 
    p_reason TEXT, 
    p_reference_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    IF p_reference_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.credits_ledger 
        WHERE reference_id = p_reference_id
    ) THEN
        RETURN true;
    END IF;
    
    SELECT credits INTO current_credits 
    FROM public.profiles 
    WHERE id = p_user_id;
    
    IF current_credits < p_amount THEN
        RETURN false;
    END IF;
    
    UPDATE public.profiles 
    SET credits = credits - p_amount,
        updated_at = now()
    WHERE id = p_user_id;
    
    INSERT INTO public.credits_ledger (user_id, amount, reason, reference_id)
    VALUES (p_user_id, -p_amount, p_reason, p_reference_id);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upload system functions
CREATE OR REPLACE FUNCTION can_user_upload(p_user_id UUID)
RETURNS TABLE(
    can_upload BOOLEAN,
    required_credits INTEGER,
    message TEXT
) AS $$
DECLARE
    user_profile RECORD;
    actual_upload_count INTEGER;
    current_upload_count INTEGER;
    current_package_count INTEGER;
    remaining_uploads INTEGER;
BEGIN
    SELECT upload_count, upload_package_count, credits
    INTO user_profile
    FROM public.profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 'User profile not found'::TEXT;
        RETURN;
    END IF;
    
    SELECT COUNT(*) INTO actual_upload_count
    FROM public.uploaded_images
    WHERE user_id = p_user_id;
    
    current_upload_count := COALESCE(user_profile.upload_count, 0);
    current_package_count := COALESCE(user_profile.upload_package_count, 0);
    
    IF current_upload_count = 0 AND actual_upload_count > 0 THEN
        IF actual_upload_count <= 25 THEN
            current_package_count := 1;
            remaining_uploads := 25 - actual_upload_count;
        ELSE
            current_package_count := CEIL(actual_upload_count::DECIMAL / 10);
            remaining_uploads := (current_package_count * 10) - actual_upload_count;
        END IF;
    ELSE
        remaining_uploads := (current_package_count * 10) - current_upload_count;
    END IF;
    
    IF current_upload_count = 0 AND current_package_count = 0 AND actual_upload_count = 0 THEN
        IF user_profile.credits >= 1 THEN
            RETURN QUERY SELECT TRUE, 1, 'First time user - 1 credit for 25 uploads'::TEXT;
        ELSE
            RETURN QUERY SELECT FALSE, 1, 'First time user needs 1 credit for 25 uploads'::TEXT;
        END IF;
        RETURN;
    END IF;
    
    IF remaining_uploads > 0 THEN
        RETURN QUERY SELECT TRUE, 0, 'Uploads remaining in current package'::TEXT;
        RETURN;
    END IF;
    
    IF user_profile.credits >= 100 THEN
        RETURN QUERY SELECT TRUE, 100, '100 credits for 10 more uploads'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 100, 'Need 100 credits for 10 more uploads'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_credits(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION spend_credits(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_upload(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_admin(UUID) TO authenticated;

\echo 'Part 2 Complete: Core functions created!'

-- =====================================================
-- PART 3: RLS POLICIES
-- =====================================================

\echo 'Starting Part 3: RLS Policies...'

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits_ledger ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles
    FOR SELECT TO public
    USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- Revenue requests policies (with admin access)
DROP POLICY IF EXISTS "revenue_requests_select_admin_all" ON public.revenue_requests;
CREATE POLICY "revenue_requests_select_admin_all" ON public.revenue_requests
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "revenue_requests_insert_own" ON public.revenue_requests;
CREATE POLICY "revenue_requests_insert_own" ON public.revenue_requests
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Marketplace transactions policies (unified access)
DROP POLICY IF EXISTS "marketplace_transactions_user_access" ON public.marketplace_transactions;
CREATE POLICY "marketplace_transactions_user_access" ON public.marketplace_transactions
    FOR SELECT TO authenticated
    USING (
        auth.uid() = buyer_id OR
        auth.uid() = seller_id OR
        buyer_id IS NULL
    );

DROP POLICY IF EXISTS "marketplace_transactions_insert_buyer" ON public.marketplace_transactions;
CREATE POLICY "marketplace_transactions_insert_buyer" ON public.marketplace_transactions
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = buyer_id OR
        buyer_id IS NULL
    );

\echo 'Part 3 Complete: RLS policies created!'

-- =====================================================
-- PART 4: STORAGE
-- =====================================================

\echo 'Starting Part 4: Storage Setup...'

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
    ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('user-uploads', 'user-uploads', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff']),
    ('generated-images', 'generated-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('temp-references', 'temp-references', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
DROP POLICY IF EXISTS "avatar_insert_own" ON storage.objects;
CREATE POLICY "avatar_insert_own" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (
    bucket_id = 'avatars' AND 
    name LIKE ('users/' || auth.uid() || '/%')
);

DROP POLICY IF EXISTS "avatar_read_public" ON storage.objects;
CREATE POLICY "avatar_read_public" ON storage.objects 
FOR SELECT TO public 
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "user_uploads_insert_own" ON storage.objects;
CREATE POLICY "user_uploads_insert_own" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (
    bucket_id = 'user-uploads' AND 
    name LIKE ('uploads/' || auth.uid() || '/%')
);

DROP POLICY IF EXISTS "user_uploads_read_public" ON storage.objects;
CREATE POLICY "user_uploads_read_public" ON storage.objects 
FOR SELECT TO public 
USING (bucket_id = 'user-uploads');

DROP POLICY IF EXISTS "generated_images_insert_own" ON storage.objects;
CREATE POLICY "generated_images_insert_own" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (
    bucket_id = 'generated-images' AND 
    name LIKE ('generations/' || auth.uid() || '/%')
);

DROP POLICY IF EXISTS "generated_images_read_public" ON storage.objects;
CREATE POLICY "generated_images_read_public" ON storage.objects 
FOR SELECT TO public 
USING (bucket_id = 'generated-images');

\echo 'Part 4 Complete: Storage buckets and policies created!'

-- =====================================================
-- PART 5: FINALIZE
-- =====================================================

\echo 'Starting Part 5: Finalization...'

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credits_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_buyers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_transactions;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Add table comments
COMMENT ON TABLE public.profiles IS 'User profiles with credits, admin status, and upload tracking';
COMMENT ON TABLE public.uploaded_images IS 'User uploaded image files with metadata and duplicate detection';
COMMENT ON TABLE public.generated_images IS 'AI-generated images with prompts and parameters';
COMMENT ON TABLE public.user_assets IS 'Unified view of user assets (uploaded and generated)';
COMMENT ON TABLE public.marketplace_listings IS 'Marketplace listings for selling assets';
COMMENT ON TABLE public.marketplace_transactions IS 'Purchase transactions between users';
COMMENT ON TABLE public.revenue_requests IS 'Revenue payout requests (credits or Stripe)';
COMMENT ON TABLE public.credits_ledger IS 'Credit transaction history and audit trail';

\echo 'Part 5 Complete: Finalization done!'

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================

\echo '====================================================='
\echo '🎉 CARDIFY DATABASE MIGRATION COMPLETE! 🎉'
\echo '====================================================='
\echo 'Your new Cardify database is ready to use!'
\echo ''
\echo 'Next steps:'
\echo '1. Update your application environment variables'
\echo '2. Test the application functionality'
\echo '3. Create your first admin user'
\echo '4. Set up any additional admin users'
\echo ''
\echo 'To create an admin user, run:'
\echo 'INSERT INTO public.admins (user_id, email) VALUES (''your-user-id'', ''your-email@example.com'');'
\echo ''
\echo 'Database setup completed successfully! 🚀'
\echo '====================================================='
