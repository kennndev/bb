-- =====================================================
-- CARDIFY COMPLETE DATABASE MIGRATION - PART 2: FUNCTIONS
-- This is Part 2 of the complete database migration
-- Run this after Part 1 (schema) is complete
-- =====================================================

-- =====================================================
-- CORE UTILITY FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admins 
        WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get authorized admin emails
CREATE OR REPLACE FUNCTION get_authorized_emails()
RETURNS TABLE(email TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT a.email
    FROM public.admins a
    ORDER BY a.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREDIT SYSTEM FUNCTIONS
-- =====================================================

-- Function to add credits to user
CREATE OR REPLACE FUNCTION add_credits(
    p_user_id UUID, 
    p_amount INTEGER, 
    p_reason TEXT, 
    p_reference_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Update profile credits
    UPDATE public.profiles 
    SET credits = credits + p_amount,
        updated_at = now()
    WHERE id = p_user_id;
    
    -- Log the transaction
    INSERT INTO public.credits_ledger (user_id, amount, reason, reference_id)
    VALUES (p_user_id, p_amount, p_reason, p_reference_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to spend credits from user
CREATE OR REPLACE FUNCTION spend_credits(
    p_user_id UUID, 
    p_amount INTEGER, 
    p_reason TEXT, 
    p_reference_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    -- Check if reference_id already processed (idempotency)
    IF p_reference_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.credits_ledger 
        WHERE reference_id = p_reference_id
    ) THEN
        RETURN true;
    END IF;
    
    -- Get current credits
    SELECT credits INTO current_credits 
    FROM public.profiles 
    WHERE id = p_user_id;
    
    -- Check if enough credits
    IF current_credits < p_amount THEN
        RETURN false;
    END IF;
    
    -- Deduct credits
    UPDATE public.profiles 
    SET credits = credits - p_amount,
        updated_at = now()
    WHERE id = p_user_id;
    
    -- Log the transaction
    INSERT INTO public.credits_ledger (user_id, amount, reason, reference_id)
    VALUES (p_user_id, -p_amount, p_reason, p_reference_id);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use free generation
CREATE OR REPLACE FUNCTION use_free_generation(
    p_user_id UUID, 
    p_reference_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    free_used INTEGER;
BEGIN
    -- Check if reference_id already processed
    IF p_reference_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.credits_ledger 
        WHERE reference_id = p_reference_id
    ) THEN
        RETURN true;
    END IF;
    
    -- Get current free generations used
    SELECT free_generations_used INTO free_used 
    FROM public.profiles 
    WHERE id = p_user_id;
    
    -- Check if under limit (1 free generation)
    IF free_used >= 1 THEN
        RETURN false;
    END IF;
    
    -- Increment free generations used
    UPDATE public.profiles 
    SET free_generations_used = free_generations_used + 1,
        updated_at = now()
    WHERE id = p_user_id;
    
    -- Log the transaction
    INSERT INTO public.credits_ledger (user_id, amount, reason, reference_id)
    VALUES (p_user_id, 0, 'free_generation', p_reference_id);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPLOAD CREDIT SYSTEM FUNCTIONS
-- =====================================================

-- Function to check if user can upload
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
    -- Get user profile
    SELECT upload_count, upload_package_count, credits
    INTO user_profile
    FROM public.profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 'User profile not found'::TEXT;
        RETURN;
    END IF;
    
    -- Get actual upload count from uploaded_images table
    SELECT COUNT(*) INTO actual_upload_count
    FROM public.uploaded_images
    WHERE user_id = p_user_id;
    
    current_upload_count := COALESCE(user_profile.upload_count, 0);
    current_package_count := COALESCE(user_profile.upload_package_count, 0);
    
    -- If upload_count is 0 but user has actually uploaded images, 
    -- we need to sync this and calculate properly
    IF current_upload_count = 0 AND actual_upload_count > 0 THEN
        -- User has uploaded images but upload_count wasn't tracked
        -- Calculate how many packages they would need
        IF actual_upload_count <= 25 THEN
            -- First package covers this
            current_package_count := 1;
            remaining_uploads := 25 - actual_upload_count;
        ELSE
            -- User needs multiple packages
            current_package_count := CEIL(actual_upload_count::DECIMAL / 10);
            remaining_uploads := (current_package_count * 10) - actual_upload_count;
        END IF;
    ELSE
        -- Calculate remaining uploads from current package
        remaining_uploads := (current_package_count * 10) - current_upload_count;
    END IF;
    
    -- If user has never uploaded before (first time user)
    IF current_upload_count = 0 AND current_package_count = 0 AND actual_upload_count = 0 THEN
        -- Check if they have at least 1 credit for first package
        IF user_profile.credits >= 1 THEN
            RETURN QUERY SELECT TRUE, 1, 'First time user - 1 credit for 25 uploads'::TEXT;
        ELSE
            RETURN QUERY SELECT FALSE, 1, 'First time user needs 1 credit for 25 uploads'::TEXT;
        END IF;
        RETURN;
    END IF;
    
    -- If user still has uploads remaining in current package
    IF remaining_uploads > 0 THEN
        RETURN QUERY SELECT TRUE, 0, 'Uploads remaining in current package'::TEXT;
        RETURN;
    END IF;
    
    -- User needs to buy more uploads - 100 credits for 10 uploads
    IF user_profile.credits >= 100 THEN
        RETURN QUERY SELECT TRUE, 100, '100 credits for 10 more uploads'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 100, 'Need 100 credits for 10 more uploads'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's upload status
CREATE OR REPLACE FUNCTION get_user_upload_status(p_user_id UUID)
RETURNS TABLE(
    upload_count INTEGER,
    upload_package_count INTEGER,
    remaining_uploads INTEGER,
    next_package_cost INTEGER,
    message TEXT
) AS $$
DECLARE
    user_profile RECORD;
    actual_upload_count INTEGER;
    current_upload_count INTEGER;
    current_package_count INTEGER;
    remaining_uploads INTEGER;
BEGIN
    -- Get user profile
    SELECT upload_count, upload_package_count, credits
    INTO user_profile
    FROM public.profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 0, 0, 0, 'User profile not found'::TEXT;
        RETURN;
    END IF;
    
    -- Get actual upload count from uploaded_images table
    SELECT COUNT(*) INTO actual_upload_count
    FROM public.uploaded_images
    WHERE user_id = p_user_id;
    
    current_upload_count := COALESCE(user_profile.upload_count, 0);
    current_package_count := COALESCE(user_profile.upload_package_count, 0);
    
    -- If upload_count is 0 but user has actually uploaded images, 
    -- we need to sync this and calculate properly
    IF current_upload_count = 0 AND actual_upload_count > 0 THEN
        -- User has uploaded images but upload_count wasn't tracked
        -- Calculate how many packages they would need
        IF actual_upload_count <= 25 THEN
            -- First package covers this
            current_package_count := 1;
            remaining_uploads := 25 - actual_upload_count;
            next_package_cost := 100; -- Next package costs 100 credits
        ELSE
            -- User needs multiple packages
            current_package_count := CEIL(actual_upload_count::DECIMAL / 10);
            remaining_uploads := (current_package_count * 10) - actual_upload_count;
            next_package_cost := 100;
        END IF;
    ELSE
        -- Normal case - calculate remaining uploads
        IF current_package_count = 0 THEN
            -- First time user
            remaining_uploads := 0;
            next_package_cost := 1;
        ELSE
            remaining_uploads := (current_package_count * 10) - current_upload_count;
            next_package_cost := 100;
        END IF;
    END IF;
    
    -- Generate message
    IF current_upload_count = 0 AND current_package_count = 0 AND actual_upload_count = 0 THEN
        RETURN QUERY SELECT 
            actual_upload_count::INTEGER, 
            current_package_count::INTEGER, 
            remaining_uploads::INTEGER, 
            next_package_cost::INTEGER, 
            'First time user - pay 1 credit for 25 uploads'::TEXT;
    ELSIF remaining_uploads > 0 THEN
        RETURN QUERY SELECT 
            actual_upload_count::INTEGER, 
            current_package_count::INTEGER, 
            remaining_uploads::INTEGER, 
            next_package_cost::INTEGER, 
            'Uploads remaining in current package'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            actual_upload_count::INTEGER, 
            current_package_count::INTEGER, 
            remaining_uploads::INTEGER, 
            next_package_cost::INTEGER, 
            'Need 100 credits for 10 more uploads'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync existing upload counts
CREATE OR REPLACE FUNCTION sync_existing_upload_counts()
RETURNS VOID AS $$
DECLARE
    user_record RECORD;
    actual_count INTEGER;
BEGIN
    -- Loop through all profiles
    FOR user_record IN SELECT id FROM public.profiles LOOP
        -- Get actual upload count from uploaded_images table
        SELECT COUNT(*) INTO actual_count
        FROM public.uploaded_images
        WHERE user_id = user_record.id;
        
        -- Update the profile with correct counts
        IF actual_count > 0 THEN
            UPDATE public.profiles
            SET 
                upload_count = actual_count,
                upload_package_count = CASE 
                    WHEN actual_count <= 25 THEN 1
                    ELSE CEIL(actual_count::DECIMAL / 10)
                END
            WHERE id = user_record.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Function to check generation credits
CREATE OR REPLACE FUNCTION check_generation_credits() 
RETURNS TRIGGER AS $$
DECLARE
    reference_id TEXT;
BEGIN
    -- Skip if no user_id
    IF NEW.user_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    reference_id := 'generation:' || NEW.id::text;
    
    -- Try to spend credits first (200 credits per generation)
    IF public.spend_credits(NEW.user_id, 200, 'generation', reference_id) THEN
        RETURN NEW;
    END IF;
    
    -- If no credits, try free generation
    IF public.use_free_generation(NEW.user_id, reference_id) THEN
        RETURN NEW;
    END IF;
    
    -- No credits or free generations available
    RAISE EXCEPTION 'insufficient_credits';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upload credits are now handled by increment_upload_count() function
-- The old check_upload_credits() function has been removed to prevent double deduction

-- Function to increment upload count
CREATE OR REPLACE FUNCTION increment_upload_count()
RETURNS TRIGGER AS $$
DECLARE
    user_profile RECORD;
    current_upload_count INTEGER;
    current_package_count INTEGER;
    required_credits INTEGER;
    upload_result RECORD;
    p_user_id UUID;
BEGIN
    -- Get user_id from the NEW row
    p_user_id := NEW.user_id;
    
    -- Check if user can upload
    SELECT * INTO upload_result FROM can_user_upload(p_user_id);
    
    IF NOT upload_result.can_upload THEN
        RAISE EXCEPTION 'Cannot upload: %', upload_result.message;
    END IF;
    
    -- Get current user profile
    SELECT upload_count, upload_package_count, credits
    INTO user_profile
    FROM public.profiles
    WHERE id = p_user_id;
    
    current_upload_count := COALESCE(user_profile.upload_count, 0);
    current_package_count := COALESCE(user_profile.upload_package_count, 0);
    required_credits := upload_result.required_credits;
    
    -- Calculate total allowed uploads with CORRECT logic
    DECLARE
        total_allowed_uploads INTEGER;
    BEGIN
        IF current_package_count = 0 THEN
            total_allowed_uploads := 0; -- No uploads allowed without a package
        ELSIF current_package_count = 1 THEN
            total_allowed_uploads := 25; -- First package gives 25 uploads
        ELSE
            total_allowed_uploads := 25 + ((current_package_count - 1) * 10); -- 25 + (additional packages × 10)
        END IF;
        
        -- Check if user has reached their upload limit
        IF current_upload_count >= total_allowed_uploads THEN
            RAISE EXCEPTION 'Upload limit reached. Purchase a package to continue uploading.';
        END IF;
        
        -- Update profile with new upload count
        UPDATE public.profiles
        SET upload_count = upload_count + 1
        WHERE id = p_user_id;
        
        -- Check if user needs to buy a new package
        -- This happens when they've used all uploads from their current packages
        IF (current_upload_count + 1) >= total_allowed_uploads THEN
            -- User has exhausted their current packages
            -- They need to manually purchase the next package
            -- We don't auto-purchase here to avoid unexpected charges
            RAISE NOTICE 'User % has exhausted their upload packages. Next package costs % credits.', 
                p_user_id, 
                CASE WHEN current_package_count = 0 THEN 1 ELSE 100 END;
        END IF;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync generated images to user assets
CREATE OR REPLACE FUNCTION sync_generated_to_assets() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_assets (
        user_id, asset_type, source_id, asset_id, title, description, image_url,
        storage_path, mime_type, file_size_bytes, metadata, created_at, updated_at
    ) VALUES (
        NEW.user_id, 'generated', NEW.id, NEW.id, COALESCE(NEW.prompt, 'Generated Image'), 
        NULL, NEW.image_url, NEW.storage_path, NEW.mime_type, NEW.file_size_bytes,
        COALESCE(NEW.metadata, '{"credits_used": 1}'::jsonb), NEW.created_at, NOW()
    ) ON CONFLICT (user_id, asset_id) DO UPDATE SET
        image_url = EXCLUDED.image_url,
        storage_path = EXCLUDED.storage_path,
        mime_type = EXCLUDED.mime_type,
        file_size_bytes = EXCLUDED.file_size_bytes,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to sync uploaded images to user assets
CREATE OR REPLACE FUNCTION sync_uploaded_to_assets() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_assets (
        user_id, asset_type, source_id, asset_id, title, description, image_url, 
        storage_path, mime_type, file_size_bytes, metadata, created_at, updated_at
    ) VALUES (
        NEW.user_id, 'uploaded', NEW.id, NEW.id, COALESCE(NEW.title, NEW.original_filename), 
        NEW.description, NEW.image_url, NEW.storage_path, NEW.mime_type, NEW.file_size_bytes,
        COALESCE(NEW.metadata, '{"credits_used": 0}'::jsonb), NEW.created_at, NOW()
    ) ON CONFLICT (user_id, asset_id) DO UPDATE SET
        image_url = EXCLUDED.image_url,
        storage_path = EXCLUDED.storage_path,
        mime_type = EXCLUDED.mime_type,
        file_size_bytes = EXCLUDED.file_size_bytes,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to sync profile from auth
CREATE OR REPLACE FUNCTION sync_profile_from_auth() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, 'unknown@no-email.local'),
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email,
        display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle profile upserts properly
CREATE OR REPLACE FUNCTION upsert_profile(
    p_user_id UUID,
    p_display_name TEXT,
    p_email TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Try to update first
    UPDATE public.profiles 
    SET 
        display_name = p_display_name,
        email = COALESCE(p_email, email, 'unknown@no-email.local'),
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- If no rows were updated, insert new record
    IF NOT FOUND THEN
        INSERT INTO public.profiles (
            id, 
            email, 
            display_name, 
            created_at, 
            updated_at
        ) VALUES (
            p_user_id,
            COALESCE(p_email, 'unknown@no-email.local'),
            p_display_name,
            NOW(),
            NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create asset buyer on transaction insert
CREATE OR REPLACE FUNCTION create_asset_buyer_on_transaction_insert() 
RETURNS TRIGGER AS $$
BEGIN
    -- Only create asset_buyer when transaction is inserted (regardless of status)
    INSERT INTO asset_buyers (
        asset_id,
        buyer_id,
        seller_id,
        listing_id,
        transaction_id,
        purchase_amount_cents,
        purchased_at
    ) VALUES (
        (SELECT asset_id FROM marketplace_listings WHERE id = NEW.listing_id),
        NEW.buyer_id,
        NEW.seller_id,
        NEW.listing_id,
        NEW.id,
        NEW.amount_cents,
        NEW.created_at
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create asset buyer on transaction complete
CREATE OR REPLACE FUNCTION create_asset_buyer_on_transaction_complete() 
RETURNS TRIGGER AS $$
BEGIN
    -- Only create asset_buyer when transaction status changes to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Check if asset_buyer already exists for this transaction
        IF NOT EXISTS (SELECT 1 FROM asset_buyers WHERE transaction_id = NEW.id) THEN
            INSERT INTO asset_buyers (
                asset_id,
                buyer_id,
                seller_id,
                listing_id,
                transaction_id,
                purchase_amount_cents,
                purchased_at
            ) VALUES (
                (SELECT asset_id FROM marketplace_listings WHERE id = NEW.listing_id),
                NEW.buyer_id,
                NEW.seller_id,
                NEW.listing_id,
                NEW.id,
                NEW.amount_cents,
                NEW.created_at
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set revenue status for new sale
CREATE OR REPLACE FUNCTION set_revenue_status_for_new_sale() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.revenue_status = 'available';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to track asset buyer
CREATE OR REPLACE FUNCTION track_asset_buyer() 
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when transaction is completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Get listing details
        INSERT INTO public.asset_buyers (
            asset_id, buyer_id, seller_id, listing_id, transaction_id, purchase_amount_cents
        )
        SELECT 
            ml.asset_id,
            NEW.buyer_id,
            ml.seller_id,
            NEW.listing_id,
            NEW.id,
            NEW.amount_cents
        FROM public.marketplace_listings ml
        WHERE ml.id = NEW.listing_id
        ON CONFLICT (asset_id, buyer_id) DO NOTHING; -- Prevent duplicates
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to transfer asset on sale
CREATE OR REPLACE FUNCTION transfer_asset_on_sale() 
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when status changes to 'sold'
    IF NEW.status = 'sold' AND OLD.status != 'sold' AND NEW.buyer_id IS NOT NULL THEN
        -- Update asset ownership
        UPDATE public.user_assets 
        SET user_id = NEW.buyer_id 
        WHERE id = NEW.asset_id;
        
        -- Update listing with sold timestamp
        UPDATE public.marketplace_listings 
        SET sold_at = now() 
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update asset listing status
CREATE OR REPLACE FUNCTION update_asset_listing_status() 
RETURNS TRIGGER AS $$
BEGIN
    -- Update user_assets.is_listed based on marketplace_listings
    UPDATE public.user_assets 
    SET is_listed = EXISTS (
        SELECT 1 FROM public.marketplace_listings 
        WHERE asset_id = user_assets.id AND status = 'active'
    )
    WHERE id = COALESCE(NEW.asset_id, OLD.asset_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user storage usage
CREATE OR REPLACE FUNCTION get_user_storage_usage(p_user_id UUID)
RETURNS TABLE(
    bucket_name TEXT,
    file_count BIGINT,
    total_size BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.name::text,
        COUNT(o.id)::bigint,
        COALESCE(SUM(o.metadata->>'size')::bigint, 0)
    FROM storage.buckets b
    LEFT JOIN storage.objects o ON b.id = o.bucket_id
    WHERE b.id IN ('avatars', 'user-uploads', 'generated-images')
    AND (o.name LIKE ('users/' || p_user_id || '/%') 
         OR o.name LIKE ('uploads/' || p_user_id || '/%')
         OR o.name LIKE ('generations/' || p_user_id || '/%'))
    GROUP BY b.id, b.name
    ORDER BY b.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions for all functions
GRANT EXECUTE ON FUNCTION add_credits(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION spend_credits(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION use_free_generation(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_upload(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_upload_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_upload_count() TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_authorized_emails() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_existing_upload_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_storage_usage(UUID) TO authenticated;

-- Function to get user transactions with proper joins
CREATE OR REPLACE FUNCTION get_user_transactions(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    amount_cents INTEGER,
    currency TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    listing_title TEXT,
    image_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mt.id,
        mt.amount_cents,
        mt.currency,
        mt.status,
        mt.created_at,
        ml.title as listing_title,
        ua.image_url
    FROM marketplace_transactions mt
    INNER JOIN marketplace_listings ml ON mt.listing_id = ml.id
    INNER JOIN user_assets ua ON ml.asset_id = ua.id
    WHERE mt.buyer_id = p_user_id
    ORDER BY mt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user upload status (fixed version)
DROP FUNCTION IF EXISTS get_user_upload_status(UUID);
CREATE OR REPLACE FUNCTION get_user_upload_status(p_user_id UUID)
RETURNS TABLE (
    upload_count INTEGER,
    remaining_uploads INTEGER,
    upload_package_count INTEGER,
    credits INTEGER,
    next_package_cost INTEGER,
    message TEXT
) AS $$
DECLARE
    profile_upload_count INTEGER;
    profile_package_count INTEGER;
    profile_credits INTEGER;
    actual_uploads_count INTEGER;
    total_allowed_uploads INTEGER;
BEGIN
    -- Get user profile data with explicit table references
    SELECT 
        p.upload_count,
        p.upload_package_count,
        p.credits
    INTO profile_upload_count, profile_package_count, profile_credits
    FROM profiles p
    WHERE p.id = p_user_id;
    
    -- If user not found, return zeros
    IF profile_upload_count IS NULL THEN
        RETURN QUERY SELECT 0, 0, 0, 0, 1, 'User not found';
        RETURN;
    END IF;
    
    -- Count actual uploads from uploaded_images table
    SELECT COUNT(*)::INTEGER
    INTO actual_uploads_count
    FROM uploaded_images
    WHERE user_id = p_user_id;
    
    -- Calculate remaining uploads with CORRECT logic
    -- First package: 25 uploads for 1 credit
    -- Subsequent packages: 10 uploads for 100 credits each
    IF profile_package_count = 0 THEN
        total_allowed_uploads := 0; -- No uploads allowed without a package
    ELSIF profile_package_count = 1 THEN
        total_allowed_uploads := 25; -- First package gives 25 uploads
    ELSE
        total_allowed_uploads := 25 + ((profile_package_count - 1) * 10); -- 25 + (additional packages × 10)
    END IF;
    
    RETURN QUERY SELECT 
        actual_uploads_count,
        GREATEST(0, total_allowed_uploads - actual_uploads_count),
        profile_package_count,
        profile_credits,
        CASE 
            WHEN profile_package_count = 0 THEN 1  -- First package costs 1 credit
            ELSE 100  -- Subsequent packages cost 100 credits
        END,
        'Upload status loaded successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION get_user_transactions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_upload_status(UUID) TO authenticated;

-- =====================================================
-- PART 2 COMPLETE
-- Next: Run migrate-to-new-schema-part3-triggers.sql
-- =====================================================
