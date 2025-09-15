-- =====================================================
-- CARDIFY COMPLETE DATABASE MIGRATION - PART 4: RLS POLICIES
-- This is Part 4 of the complete database migration
-- Run this after Part 3 (triggers) is complete
-- =====================================================

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_card_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Users can view all profiles (for marketplace, etc.)
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles
    FOR SELECT TO public
    USING (true);

-- Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Users can insert their own profile (on signup)
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- =====================================================
-- ADMINS TABLE POLICIES
-- =====================================================

-- Only admins can view admin table (fixed to avoid infinite recursion)
DROP POLICY IF EXISTS "admins_select_admin_only" ON public.admins;
CREATE POLICY "admins_select_admin_only" ON public.admins
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND is_admin = TRUE
        )
    );

-- Only admins can manage admin table (fixed to avoid infinite recursion)
DROP POLICY IF EXISTS "admins_manage_admin_only" ON public.admins;
CREATE POLICY "admins_manage_admin_only" ON public.admins
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND is_admin = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND is_admin = TRUE
        )
    );

-- =====================================================
-- UPLOADED IMAGES TABLE POLICIES
-- =====================================================

-- Users can view all uploaded images
DROP POLICY IF EXISTS "uploaded_images_select_all" ON public.uploaded_images;
CREATE POLICY "uploaded_images_select_all" ON public.uploaded_images
    FOR SELECT TO public
    USING (true);

-- Users can insert their own images
DROP POLICY IF EXISTS "uploaded_images_insert_own" ON public.uploaded_images;
CREATE POLICY "uploaded_images_insert_own" ON public.uploaded_images
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own images
DROP POLICY IF EXISTS "uploaded_images_update_own" ON public.uploaded_images;
CREATE POLICY "uploaded_images_update_own" ON public.uploaded_images
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own images
DROP POLICY IF EXISTS "uploaded_images_delete_own" ON public.uploaded_images;
CREATE POLICY "uploaded_images_delete_own" ON public.uploaded_images
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- =====================================================
-- GENERATED IMAGES TABLE POLICIES
-- =====================================================

-- Users can view all generated images
DROP POLICY IF EXISTS "generated_images_select_all" ON public.generated_images;
CREATE POLICY "generated_images_select_all" ON public.generated_images
    FOR SELECT TO public
    USING (true);

-- Users can insert their own generated images
DROP POLICY IF EXISTS "generated_images_insert_own" ON public.generated_images;
CREATE POLICY "generated_images_insert_own" ON public.generated_images
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own generated images
DROP POLICY IF EXISTS "generated_images_update_own" ON public.generated_images;
CREATE POLICY "generated_images_update_own" ON public.generated_images
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own generated images
DROP POLICY IF EXISTS "generated_images_delete_own" ON public.generated_images;
CREATE POLICY "generated_images_delete_own" ON public.generated_images
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- =====================================================
-- USER ASSETS TABLE POLICIES
-- =====================================================

-- Users can view all user assets
DROP POLICY IF EXISTS "user_assets_select_all" ON public.user_assets;
CREATE POLICY "user_assets_select_all" ON public.user_assets
    FOR SELECT TO public
    USING (true);

-- Users can insert their own assets
DROP POLICY IF EXISTS "user_assets_insert_own" ON public.user_assets;
CREATE POLICY "user_assets_insert_own" ON public.user_assets
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own assets
DROP POLICY IF EXISTS "user_assets_update_own" ON public.user_assets;
CREATE POLICY "user_assets_update_own" ON public.user_assets
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own assets
DROP POLICY IF EXISTS "user_assets_delete_own" ON public.user_assets;
CREATE POLICY "user_assets_delete_own" ON public.user_assets
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- =====================================================
-- DUPLICATE DETECTIONS TABLE POLICIES
-- =====================================================

-- Users can view all duplicate detections
DROP POLICY IF EXISTS "duplicate_detections_select_all" ON public.duplicate_detections;
CREATE POLICY "duplicate_detections_select_all" ON public.duplicate_detections
    FOR SELECT TO public
    USING (true);

-- Users can insert duplicate detections
DROP POLICY IF EXISTS "duplicate_detections_insert_all" ON public.duplicate_detections;
CREATE POLICY "duplicate_detections_insert_all" ON public.duplicate_detections
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Only admins can update duplicate detections (approve/reject)
DROP POLICY IF EXISTS "duplicate_detections_update_admin_only" ON public.duplicate_detections;
CREATE POLICY "duplicate_detections_update_admin_only" ON public.duplicate_detections
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- MARKETPLACE LISTINGS TABLE POLICIES
-- =====================================================

-- Users can view all marketplace listings
DROP POLICY IF EXISTS "marketplace_listings_select_all" ON public.marketplace_listings;
CREATE POLICY "marketplace_listings_select_all" ON public.marketplace_listings
    FOR SELECT TO public
    USING (true);

-- Users can create listings for their own assets
DROP POLICY IF EXISTS "marketplace_listings_insert_own" ON public.marketplace_listings;
CREATE POLICY "marketplace_listings_insert_own" ON public.marketplace_listings
    FOR INSERT TO authenticated
    WITH CHECK (seller_id = auth.uid());

-- Users can update their own listings
DROP POLICY IF EXISTS "marketplace_listings_update_own" ON public.marketplace_listings;
CREATE POLICY "marketplace_listings_update_own" ON public.marketplace_listings
    FOR UPDATE TO authenticated
    USING (seller_id = auth.uid())
    WITH CHECK (seller_id = auth.uid());

-- Users can delete their own listings
DROP POLICY IF EXISTS "marketplace_listings_delete_own" ON public.marketplace_listings;
CREATE POLICY "marketplace_listings_delete_own" ON public.marketplace_listings
    FOR DELETE TO authenticated
    USING (seller_id = auth.uid());

-- =====================================================
-- MARKETPLACE TRANSACTIONS TABLE POLICIES
-- =====================================================

-- Users can view transactions where they are buyer OR seller
DROP POLICY IF EXISTS "marketplace_transactions_user_access" ON public.marketplace_transactions;
CREATE POLICY "marketplace_transactions_user_access" ON public.marketplace_transactions
    FOR SELECT TO authenticated
    USING (
        auth.uid() = buyer_id OR           -- User is the buyer
        auth.uid() = seller_id OR          -- User is the seller  
        buyer_id IS NULL                   -- Or buyer is null (system transactions)
    );

-- Allow buyers to read their transaction data with joins
DROP POLICY IF EXISTS "marketplace_transactions_buyer_read" ON public.marketplace_transactions;
CREATE POLICY "marketplace_transactions_buyer_read" ON public.marketplace_transactions
    FOR SELECT TO authenticated
    USING (
        buyer_id = auth.uid() OR 
        seller_id = auth.uid() OR
        buyer_id IS NULL -- Allow anonymous transactions
    );

-- Users can insert transactions where they are the buyer
DROP POLICY IF EXISTS "marketplace_transactions_insert_buyer" ON public.marketplace_transactions;
CREATE POLICY "marketplace_transactions_insert_buyer" ON public.marketplace_transactions
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = buyer_id OR           -- User is the buyer
        buyer_id IS NULL                   -- Or buyer is null (system transactions)
    );

-- Users can update their own transactions
DROP POLICY IF EXISTS "marketplace_transactions_update_own" ON public.marketplace_transactions;
CREATE POLICY "marketplace_transactions_update_own" ON public.marketplace_transactions
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = buyer_id OR           -- User is the buyer
        auth.uid() = seller_id             -- User is the seller
    )
    WITH CHECK (
        auth.uid() = buyer_id OR           -- User is the buyer
        auth.uid() = seller_id             -- User is the seller
    );

-- =====================================================
-- ASSET BUYERS TABLE POLICIES
-- =====================================================

-- Users can view asset buyers where they are buyer or seller
DROP POLICY IF EXISTS "asset_buyers_owner_read" ON public.asset_buyers;
CREATE POLICY "asset_buyers_owner_read" ON public.asset_buyers
    FOR SELECT TO public
    USING (
        (auth.uid() = buyer_id) OR 
        (auth.uid() = seller_id) OR 
        (buyer_id IS NULL)
    );

-- Users can insert asset buyers where they are the buyer
DROP POLICY IF EXISTS "asset_buyers_insert_buyer" ON public.asset_buyers;
CREATE POLICY "asset_buyers_insert_buyer" ON public.asset_buyers
    FOR INSERT TO public
    WITH CHECK (
        (auth.uid() = buyer_id) OR 
        (buyer_id IS NULL)
    );

-- Sellers can update their own asset buyers
DROP POLICY IF EXISTS "asset_buyers_seller_update" ON public.asset_buyers;
CREATE POLICY "asset_buyers_seller_update" ON public.asset_buyers
    FOR UPDATE TO public
    USING (auth.uid() = seller_id)
    WITH CHECK (auth.uid() = seller_id);

-- =====================================================
-- REVENUE REQUESTS TABLE POLICIES
-- =====================================================

-- Users can view their own revenue requests OR admins can see all
DROP POLICY IF EXISTS "revenue_requests_select_admin_all" ON public.revenue_requests;
CREATE POLICY "revenue_requests_select_admin_all" ON public.revenue_requests
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR  -- Users can see their own
        EXISTS (                  -- OR admins can see all
            SELECT 1 FROM public.admins 
            WHERE user_id = auth.uid()
        )
    );

-- Users can insert their own revenue requests
DROP POLICY IF EXISTS "revenue_requests_insert_own" ON public.revenue_requests;
CREATE POLICY "revenue_requests_insert_own" ON public.revenue_requests
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own revenue requests
DROP POLICY IF EXISTS "revenue_requests_update_own" ON public.revenue_requests;
CREATE POLICY "revenue_requests_update_own" ON public.revenue_requests
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Only admins can process revenue requests
DROP POLICY IF EXISTS "revenue_requests_process_admin_only" ON public.revenue_requests;
CREATE POLICY "revenue_requests_process_admin_only" ON public.revenue_requests
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- REVENUE TRACKING TABLE POLICIES
-- =====================================================

-- Users can view their own revenue tracking
DROP POLICY IF EXISTS "revenue_tracking_owner" ON public.revenue_tracking;
CREATE POLICY "revenue_tracking_owner" ON public.revenue_tracking
    FOR ALL TO public
    USING (auth.uid() = seller_id)
    WITH CHECK (auth.uid() = seller_id);

-- =====================================================
-- CREDITS LEDGER TABLE POLICIES
-- =====================================================

-- Users can view their own credit transactions
DROP POLICY IF EXISTS "credits_ledger_select_own" ON public.credits_ledger;
CREATE POLICY "credits_ledger_select_own" ON public.credits_ledger
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own credit transactions
DROP POLICY IF EXISTS "credits_ledger_insert_own" ON public.credits_ledger;
CREATE POLICY "credits_ledger_insert_own" ON public.credits_ledger
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- UPLOAD PACKAGES TABLE POLICIES
-- =====================================================

-- Users can view their own upload packages
DROP POLICY IF EXISTS "upload_packages_select_own" ON public.upload_packages;
CREATE POLICY "upload_packages_select_own" ON public.upload_packages
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own upload packages
DROP POLICY IF EXISTS "upload_packages_insert_own" ON public.upload_packages;
CREATE POLICY "upload_packages_insert_own" ON public.upload_packages
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own upload packages
DROP POLICY IF EXISTS "upload_packages_update_own" ON public.upload_packages;
CREATE POLICY "upload_packages_update_own" ON public.upload_packages
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- CUSTOM CARD ORDERS TABLE POLICIES
-- =====================================================

-- Users can manage their own custom card orders
DROP POLICY IF EXISTS "custom_card_orders_owner" ON public.custom_card_orders;
CREATE POLICY "custom_card_orders_owner" ON public.custom_card_orders
    FOR ALL TO public
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- GUEST QUOTAS TABLE POLICIES
-- =====================================================

-- Public access for guest quotas
DROP POLICY IF EXISTS "guest_quotas_select_all" ON public.guest_quotas;
CREATE POLICY "guest_quotas_select_all" ON public.guest_quotas
    FOR SELECT TO public
    USING (true);

DROP POLICY IF EXISTS "guest_quotas_insert_all" ON public.guest_quotas;
CREATE POLICY "guest_quotas_insert_all" ON public.guest_quotas
    FOR INSERT TO public
    WITH CHECK (true);

DROP POLICY IF EXISTS "guest_quotas_update_all" ON public.guest_quotas;
CREATE POLICY "guest_quotas_update_all" ON public.guest_quotas
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "guest_quotas_delete_all" ON public.guest_quotas;
CREATE POLICY "guest_quotas_delete_all" ON public.guest_quotas
    FOR DELETE TO public
    USING (true);

-- =====================================================
-- APP EVENTS TABLE POLICIES
-- =====================================================

-- Public can insert app events
DROP POLICY IF EXISTS "app_events_insert_all" ON public.app_events;
CREATE POLICY "app_events_insert_all" ON public.app_events
    FOR INSERT TO public
    WITH CHECK (true);

-- =====================================================
-- ASSET VIEWS TABLE POLICIES
-- =====================================================

-- Public can insert asset views
DROP POLICY IF EXISTS "asset_views_insert_all" ON public.asset_views;
CREATE POLICY "asset_views_insert_all" ON public.asset_views
    FOR INSERT TO public
    WITH CHECK (true);

-- =====================================================
-- USER ACTIVITY TABLE POLICIES
-- =====================================================

-- Users can manage their own activity
DROP POLICY IF EXISTS "user_activity_owner" ON public.user_activity;
CREATE POLICY "user_activity_owner" ON public.user_activity
    FOR ALL TO public
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- STRIPE EVENTS TABLE POLICIES
-- =====================================================

-- Only service role can access stripe events
-- Note: These policies should be configured based on your service role setup
-- For now, we'll allow authenticated users to read (adjust as needed)

-- =====================================================
-- WEBHOOK EVENTS TABLE POLICIES
-- =====================================================

-- Only service role can access webhook events
-- Note: These policies should be configured based on your service role setup

-- =====================================================
-- PART 4 COMPLETE
-- Next: Run migrate-to-new-schema-part5-storage.sql
-- =====================================================
