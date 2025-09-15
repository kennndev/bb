-- =====================================================
-- CARDIFY COMPLETE DATABASE MIGRATION - PART 1: SCHEMA
-- This is Part 1 of the complete database migration
-- Run this first in your new Supabase database
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE, -- Made nullable to support upsert operations
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
    asset_id UUID, -- Added for compatibility
    title TEXT,
    description TEXT,
    image_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    file_size_bytes BIGINT,
    is_public BOOLEAN DEFAULT FALSE,
    is_listed BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}', -- Added for credit tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(asset_type, source_id),
    UNIQUE(user_id, asset_id) -- Added for proper upsert operations
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
    asset_id UUID REFERENCES public.user_assets(id) ON DELETE CASCADE NOT NULL, -- Added foreign key to user_assets
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
    revenue_request_id UUID,
    UNIQUE(asset_id, buyer_id) -- Prevent duplicate purchases of same asset by same buyer
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

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_admin ON public.profiles(is_admin);

-- Uploaded images indexes
CREATE INDEX IF NOT EXISTS idx_uploaded_images_user_id ON public.uploaded_images(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_images_duplicate ON public.uploaded_images(is_duplicate);

-- Generated images indexes
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON public.generated_images(user_id);

-- User assets indexes
CREATE INDEX IF NOT EXISTS idx_user_assets_user_id ON public.user_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_assets_asset_type ON public.user_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_user_assets_source_id ON public.user_assets(source_id);
CREATE INDEX IF NOT EXISTS idx_user_assets_public ON public.user_assets(is_public);
CREATE INDEX IF NOT EXISTS idx_user_assets_listed ON public.user_assets(is_listed);

-- Duplicate detections indexes
CREATE INDEX IF NOT EXISTS idx_duplicate_detections_status ON public.duplicate_detections(status);
CREATE INDEX IF NOT EXISTS idx_duplicate_detections_user_id ON public.duplicate_detections(user_id);

-- Marketplace indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_id ON public.marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON public.marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_asset_id ON public.marketplace_listings(asset_id);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer_id ON public.marketplace_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_seller_id ON public.marketplace_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_status ON public.marketplace_transactions(status);

-- Asset buyers indexes
CREATE INDEX IF NOT EXISTS idx_asset_buyers_seller_id ON public.asset_buyers(seller_id);
CREATE INDEX IF NOT EXISTS idx_asset_buyers_revenue_status ON public.asset_buyers(revenue_status);
CREATE INDEX IF NOT EXISTS idx_asset_buyers_transaction_id ON public.asset_buyers(transaction_id);

-- Revenue tracking indexes
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_seller_id ON public.revenue_tracking(seller_id);
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_revenue_status ON public.revenue_tracking(revenue_status);
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_asset_buyer_id ON public.revenue_tracking(asset_buyer_id);

-- Revenue requests indexes
CREATE INDEX IF NOT EXISTS idx_revenue_requests_user_id ON public.revenue_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_requests_status ON public.revenue_requests(status);
CREATE INDEX IF NOT EXISTS idx_revenue_requests_type ON public.revenue_requests(request_type);

-- Credits ledger indexes
CREATE INDEX IF NOT EXISTS idx_credits_ledger_user_id ON public.credits_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_ledger_reference_id ON public.credits_ledger(reference_id);
CREATE INDEX IF NOT EXISTS idx_credits_ledger_created_at ON public.credits_ledger(created_at);

-- Upload packages indexes
CREATE INDEX IF NOT EXISTS idx_upload_packages_user_id ON public.upload_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_packages_status ON public.upload_packages(status);

-- Custom card orders indexes
CREATE INDEX IF NOT EXISTS idx_custom_card_orders_user_id ON public.custom_card_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_card_orders_status ON public.custom_card_orders(status);

-- Guest quotas indexes
CREATE INDEX IF NOT EXISTS idx_guest_quotas_device_id ON public.guest_quotas(device_id);

-- App events indexes
CREATE INDEX IF NOT EXISTS idx_app_events_user_id ON public.app_events(user_id);
CREATE INDEX IF NOT EXISTS idx_app_events_event_name ON public.app_events(event_name);
CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON public.app_events(created_at);

-- Asset views indexes
CREATE INDEX IF NOT EXISTS idx_asset_views_asset_id ON public.asset_views(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_views_viewer_id ON public.asset_views(viewer_id);

-- User activity indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON public.user_activity(activity_type);

-- Stripe events indexes
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON public.stripe_events(type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_created ON public.stripe_events(created);

-- =====================================================
-- PART 1 COMPLETE
-- Next: Run migrate-to-new-schema-part2-functions.sql
-- =====================================================
