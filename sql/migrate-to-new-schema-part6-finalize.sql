-- =====================================================
-- CARDIFY COMPLETE DATABASE MIGRATION - PART 6: FINALIZE
-- This is Part 6 of the complete database migration
-- Run this after Part 5 (storage) is complete
-- =====================================================

-- =====================================================
-- ENABLE REALTIME FOR KEY TABLES
-- =====================================================

-- Enable realtime for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credits_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_buyers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.revenue_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_listings;

-- =====================================================
-- GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Grant sequence permissions
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Grant function permissions
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Grant specific permissions for profile upsert function
GRANT EXECUTE ON FUNCTION upsert_profile(UUID, TEXT, TEXT) TO authenticated;

-- =====================================================
-- SYNC EXISTING DATA (if migrating from old database)
-- =====================================================

-- Run the sync function to fix existing upload counts
-- This is safe to run even on a fresh database
SELECT sync_existing_upload_counts();

-- =====================================================
-- ADD TABLE COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.profiles IS 'User profiles with credits, admin status, and upload tracking';
COMMENT ON TABLE public.admins IS 'Admin user management table';
COMMENT ON TABLE public.uploaded_images IS 'User uploaded image files with metadata and duplicate detection';
COMMENT ON TABLE public.generated_images IS 'AI-generated images with prompts and parameters';
COMMENT ON TABLE public.user_assets IS 'Unified view of user assets (uploaded and generated)';
COMMENT ON TABLE public.duplicate_detections IS 'Duplicate image detection results and admin reviews';
COMMENT ON TABLE public.marketplace_listings IS 'Marketplace listings for selling assets';
COMMENT ON TABLE public.marketplace_transactions IS 'Purchase transactions between users';
COMMENT ON TABLE public.asset_buyers IS 'Asset purchase records with revenue tracking';
COMMENT ON TABLE public.revenue_requests IS 'Revenue payout requests (credits or Stripe)';
COMMENT ON TABLE public.revenue_tracking IS 'Revenue status tracking for sales';
COMMENT ON TABLE public.credits_ledger IS 'Credit transaction history and audit trail';
COMMENT ON TABLE public.upload_packages IS 'Upload package purchases and usage tracking';
COMMENT ON TABLE public.custom_card_orders IS 'Physical card printing orders';
COMMENT ON TABLE public.guest_quotas IS 'Usage quotas for non-authenticated users';
COMMENT ON TABLE public.app_events IS 'Application analytics and event tracking';
COMMENT ON TABLE public.asset_views IS 'Asset view tracking for analytics';
COMMENT ON TABLE public.user_activity IS 'User activity logging';
COMMENT ON TABLE public.stripe_events IS 'Stripe webhook event storage';
COMMENT ON TABLE public.webhook_events IS 'General webhook event processing';

-- =====================================================
-- CREATE MATERIALIZED VIEWS (Optional)
-- =====================================================

-- Active marketplace listings view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_active_listings AS
SELECT 
    ml.id,
    ml.seller_id,
    ml.asset_id,
    ml.title,
    ml.description,
    ml.price_cents,
    ml.currency,
    ml.created_at,
    p.display_name as seller_name,
    p.avatar_url as seller_avatar,
    ua.image_url,
    ua.asset_type
FROM public.marketplace_listings ml
JOIN public.profiles p ON ml.seller_id = p.id
JOIN public.user_assets ua ON ml.asset_id = ua.id
WHERE ml.status = 'active'
ORDER BY ml.created_at DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_active_listings_seller_id ON public.mv_active_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_mv_active_listings_created_at ON public.mv_active_listings(created_at);

-- =====================================================
-- CREATE REFRESH FUNCTION FOR MATERIALIZED VIEWS
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.mv_active_listings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_materialized_views() TO authenticated;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

-- Check that all tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'profiles', 'admins', 'uploaded_images', 'generated_images', 'user_assets',
        'duplicate_detections', 'marketplace_listings', 'marketplace_transactions',
        'asset_buyers', 'revenue_requests', 'revenue_tracking', 'credits_ledger',
        'upload_packages', 'custom_card_orders', 'guest_quotas', 'app_events',
        'asset_views', 'user_activity', 'stripe_events', 'webhook_events'
    ];
    missing_tables TEXT[] := '{}';
    current_table TEXT;
BEGIN
    -- Check each expected table
    FOREACH current_table IN ARRAY expected_tables
    LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = current_table;
        
        IF table_count = 0 THEN
            missing_tables := array_append(missing_tables, current_table);
        END IF;
    END LOOP;
    
    -- Report results
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE 'WARNING: Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'SUCCESS: All expected tables created successfully!';
    END IF;
    
    -- Count total tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = ANY(expected_tables);
    
    RAISE NOTICE 'Total tables created: %', table_count;
END $$;

-- Check that all functions were created successfully
DO $$
DECLARE
    function_count INTEGER;
    expected_functions TEXT[] := ARRAY[
        'add_credits', 'spend_credits', 'use_free_generation', 'can_user_upload',
        'get_user_upload_status', 'increment_upload_count', 'is_user_admin',
        'get_authorized_emails', 'sync_existing_upload_counts', 'get_user_storage_usage',
        'check_generation_credits', 'check_upload_credits', 'sync_generated_to_assets',
        'sync_uploaded_to_assets', 'sync_profile_from_auth', 'create_asset_buyer_on_transaction_insert',
        'create_asset_buyer_on_transaction_complete', 'set_revenue_status_for_new_sale',
        'track_asset_buyer', 'transfer_asset_on_sale', 'update_asset_listing_status',
        'update_updated_at', 'cleanup_orphaned_storage', 'cleanup_old_temp_files',
        'refresh_materialized_views'
    ];
    missing_functions TEXT[] := '{}';
    function_name TEXT;
BEGIN
    -- Check each expected function
    FOREACH function_name IN ARRAY expected_functions
    LOOP
        SELECT COUNT(*) INTO function_count
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = function_name
        AND routine_type = 'FUNCTION';
        
        IF function_count = 0 THEN
            missing_functions := array_append(missing_functions, function_name);
        END IF;
    END LOOP;
    
    -- Report results
    IF array_length(missing_functions, 1) > 0 THEN
        RAISE NOTICE 'WARNING: Missing functions: %', array_to_string(missing_functions, ', ');
    ELSE
        RAISE NOTICE 'SUCCESS: All expected functions created successfully!';
    END IF;
    
    -- Count total functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = ANY(expected_functions)
    AND routine_type = 'FUNCTION';
    
    RAISE NOTICE 'Total functions created: %', function_count;
END $$;

-- Check that all storage buckets were created
DO $$
DECLARE
    bucket_count INTEGER;
    expected_buckets TEXT[] := ARRAY['avatars', 'user-uploads', 'generated-images', 'temp-references'];
    missing_buckets TEXT[] := '{}';
    bucket_name TEXT;
BEGIN
    -- Check each expected bucket
    FOREACH bucket_name IN ARRAY expected_buckets
    LOOP
        SELECT COUNT(*) INTO bucket_count
        FROM storage.buckets 
        WHERE id = bucket_name;
        
        IF bucket_count = 0 THEN
            missing_buckets := array_append(missing_buckets, bucket_name);
        END IF;
    END LOOP;
    
    -- Report results
    IF array_length(missing_buckets, 1) > 0 THEN
        RAISE NOTICE 'WARNING: Missing storage buckets: %', array_to_string(missing_buckets, ', ');
    ELSE
        RAISE NOTICE 'SUCCESS: All expected storage buckets created successfully!';
    END IF;
    
    -- Count total buckets
    SELECT COUNT(*) INTO bucket_count
    FROM storage.buckets 
    WHERE id = ANY(expected_buckets);
    
    RAISE NOTICE 'Total storage buckets created: %', bucket_count;
END $$;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '🎉 CARDIFY DATABASE MIGRATION COMPLETE! 🎉';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Your new Cardify database is ready to use!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update your application environment variables';
    RAISE NOTICE '2. Test the application functionality';
    RAISE NOTICE '3. Create your first admin user';
    RAISE NOTICE '4. Set up any additional admin users';
    RAISE NOTICE '';
    RAISE NOTICE 'To create an admin user, run:';
    RAISE NOTICE 'INSERT INTO public.admins (user_id, email) VALUES (''your-user-id'', ''your-email@example.com'');';
    RAISE NOTICE '';
    RAISE NOTICE 'Database setup completed successfully! 🚀';
    RAISE NOTICE '=====================================================';
END $$;
