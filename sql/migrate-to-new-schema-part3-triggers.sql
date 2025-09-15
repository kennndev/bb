-- =====================================================
-- CARDIFY COMPLETE DATABASE MIGRATION - PART 3: TRIGGERS
-- This is Part 3 of the complete database migration
-- Run this after Part 2 (functions) is complete
-- =====================================================

-- =====================================================
-- UPDATE TIMESTAMP TRIGGERS
-- =====================================================

-- Profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- Uploaded images table
DROP TRIGGER IF EXISTS update_uploaded_images_updated_at ON uploaded_images;
CREATE TRIGGER update_uploaded_images_updated_at 
    BEFORE UPDATE ON uploaded_images 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- Generated images table
DROP TRIGGER IF EXISTS update_generated_images_updated_at ON generated_images;
CREATE TRIGGER update_generated_images_updated_at 
    BEFORE UPDATE ON generated_images 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- User assets table
DROP TRIGGER IF EXISTS update_user_assets_updated_at ON user_assets;
CREATE TRIGGER update_user_assets_updated_at 
    BEFORE UPDATE ON user_assets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- Duplicate detections table
DROP TRIGGER IF EXISTS update_duplicate_detections_updated_at ON duplicate_detections;
CREATE TRIGGER update_duplicate_detections_updated_at 
    BEFORE UPDATE ON duplicate_detections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- Marketplace listings table
DROP TRIGGER IF EXISTS update_marketplace_listings_updated_at ON marketplace_listings;
CREATE TRIGGER update_marketplace_listings_updated_at 
    BEFORE UPDATE ON marketplace_listings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- Marketplace transactions table
DROP TRIGGER IF EXISTS update_marketplace_transactions_updated_at ON marketplace_transactions;
CREATE TRIGGER update_marketplace_transactions_updated_at 
    BEFORE UPDATE ON marketplace_transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- Revenue requests table
DROP TRIGGER IF EXISTS update_revenue_requests_updated_at ON revenue_requests;
CREATE TRIGGER update_revenue_requests_updated_at 
    BEFORE UPDATE ON revenue_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- Upload packages table
DROP TRIGGER IF EXISTS update_upload_packages_updated_at ON upload_packages;
CREATE TRIGGER update_upload_packages_updated_at 
    BEFORE UPDATE ON upload_packages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- Custom card orders table
DROP TRIGGER IF EXISTS update_custom_card_orders_updated_at ON custom_card_orders;
CREATE TRIGGER update_custom_card_orders_updated_at 
    BEFORE UPDATE ON custom_card_orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- Revenue tracking table
DROP TRIGGER IF EXISTS update_revenue_tracking_updated_at ON revenue_tracking;
CREATE TRIGGER update_revenue_tracking_updated_at 
    BEFORE UPDATE ON revenue_tracking 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- CREDIT SYSTEM TRIGGERS
-- =====================================================

-- Check generation credits before inserting generated images
DROP TRIGGER IF EXISTS check_generation_credits_trigger ON generated_images;
CREATE TRIGGER check_generation_credits_trigger 
    BEFORE INSERT ON generated_images 
    FOR EACH ROW 
    EXECUTE FUNCTION check_generation_credits();

-- Upload credits are now handled by increment_upload_count_trigger
-- The old check_upload_credits_trigger has been removed to prevent double deduction

-- Increment upload count after inserting uploaded images
DROP TRIGGER IF EXISTS increment_upload_count_trigger ON uploaded_images;
CREATE TRIGGER increment_upload_count_trigger 
    AFTER INSERT ON uploaded_images 
    FOR EACH ROW 
    EXECUTE FUNCTION increment_upload_count();

-- =====================================================
-- ASSET SYNC TRIGGERS
-- =====================================================

-- Sync generated images to user assets
DROP TRIGGER IF EXISTS sync_generated_to_assets_trigger ON generated_images;
CREATE TRIGGER sync_generated_to_assets_trigger 
    AFTER INSERT ON generated_images 
    FOR EACH ROW 
    EXECUTE FUNCTION sync_generated_to_assets();

-- Sync generated images updates to user assets
DROP TRIGGER IF EXISTS sync_generated_to_assets_update_trigger ON generated_images;
CREATE TRIGGER sync_generated_to_assets_update_trigger 
    AFTER UPDATE ON generated_images 
    FOR EACH ROW 
    EXECUTE FUNCTION sync_generated_to_assets();

-- Sync uploaded images to user assets
DROP TRIGGER IF EXISTS sync_uploaded_to_assets_trigger ON uploaded_images;
CREATE TRIGGER sync_uploaded_to_assets_trigger 
    AFTER INSERT ON uploaded_images 
    FOR EACH ROW 
    EXECUTE FUNCTION sync_uploaded_to_assets();

-- Sync uploaded images updates to user assets
DROP TRIGGER IF EXISTS sync_uploaded_to_assets_update_trigger ON uploaded_images;
CREATE TRIGGER sync_uploaded_to_assets_update_trigger 
    AFTER UPDATE ON uploaded_images 
    FOR EACH ROW 
    EXECUTE FUNCTION sync_uploaded_to_assets();

-- =====================================================
-- PROFILE SYNC TRIGGERS
-- =====================================================

-- Sync profile from auth.users (if using Supabase Auth)
-- Note: This trigger should be created on auth.users table
DROP TRIGGER IF EXISTS sync_profile_from_auth_trigger ON auth.users;
CREATE TRIGGER sync_profile_from_auth_trigger 
    AFTER INSERT ON auth.users 
    FOR EACH ROW 
    EXECUTE FUNCTION sync_profile_from_auth();

-- =====================================================
-- MARKETPLACE TRIGGERS
-- =====================================================

-- Update asset listing status when marketplace listings change
DROP TRIGGER IF EXISTS update_asset_listing_status_insert_trigger ON marketplace_listings;
CREATE TRIGGER update_asset_listing_status_insert_trigger 
    AFTER INSERT ON marketplace_listings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_asset_listing_status();

DROP TRIGGER IF EXISTS update_asset_listing_status_update_trigger ON marketplace_listings;
CREATE TRIGGER update_asset_listing_status_update_trigger 
    AFTER UPDATE ON marketplace_listings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_asset_listing_status();

DROP TRIGGER IF EXISTS update_asset_listing_status_delete_trigger ON marketplace_listings;
CREATE TRIGGER update_asset_listing_status_delete_trigger 
    AFTER DELETE ON marketplace_listings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_asset_listing_status();

-- Create asset buyer on transaction insert
DROP TRIGGER IF EXISTS trigger_create_asset_buyer_insert ON marketplace_transactions;
CREATE TRIGGER trigger_create_asset_buyer_insert 
    AFTER INSERT ON marketplace_transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION create_asset_buyer_on_transaction_insert();

-- Create asset buyer on transaction complete
DROP TRIGGER IF EXISTS trigger_create_asset_buyer_update ON marketplace_transactions;
CREATE TRIGGER trigger_create_asset_buyer_update 
    AFTER UPDATE ON marketplace_transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION create_asset_buyer_on_transaction_complete();

-- Track asset buyer on transaction completion
DROP TRIGGER IF EXISTS track_asset_buyer_trigger ON marketplace_transactions;
CREATE TRIGGER track_asset_buyer_trigger 
    AFTER UPDATE ON marketplace_transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION track_asset_buyer();

-- Transfer asset on sale
DROP TRIGGER IF EXISTS transfer_asset_on_sale_trigger ON marketplace_listings;
CREATE TRIGGER transfer_asset_on_sale_trigger 
    AFTER UPDATE ON marketplace_listings 
    FOR EACH ROW 
    EXECUTE FUNCTION transfer_asset_on_sale();

-- =====================================================
-- REVENUE TRACKING TRIGGERS
-- =====================================================

-- Set revenue status for new sales
DROP TRIGGER IF EXISTS trigger_set_revenue_status ON asset_buyers;
CREATE TRIGGER trigger_set_revenue_status 
    BEFORE INSERT ON asset_buyers 
    FOR EACH ROW 
    EXECUTE FUNCTION set_revenue_status_for_new_sale();

-- =====================================================
-- STORAGE CLEANUP TRIGGERS (Optional)
-- =====================================================

-- Function to clean up orphaned storage files
CREATE OR REPLACE FUNCTION cleanup_orphaned_storage() RETURNS TRIGGER AS $$
BEGIN
    -- Delete storage file when uploaded_image is deleted
    IF TG_TABLE_NAME = 'uploaded_images' THEN
        DELETE FROM storage.objects 
        WHERE bucket_id = 'user-uploads' 
        AND name = OLD.storage_path;
    END IF;
    
    -- Delete storage file when generated_image is deleted
    IF TG_TABLE_NAME = 'generated_images' THEN
        DELETE FROM storage.objects 
        WHERE bucket_id = 'generated-images' 
        AND name = OLD.storage_path;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create cleanup triggers
DROP TRIGGER IF EXISTS cleanup_uploaded_storage ON uploaded_images;
CREATE TRIGGER cleanup_uploaded_storage
    AFTER DELETE ON uploaded_images
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_orphaned_storage();

DROP TRIGGER IF EXISTS cleanup_generated_storage ON generated_images;
CREATE TRIGGER cleanup_generated_storage
    AFTER DELETE ON generated_images
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_orphaned_storage();

-- =====================================================
-- PART 3 COMPLETE
-- Next: Run migrate-to-new-schema-part4-rls.sql
-- =====================================================
