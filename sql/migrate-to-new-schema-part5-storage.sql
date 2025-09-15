-- =====================================================
-- CARDIFY COMPLETE DATABASE MIGRATION - PART 5: STORAGE
-- This is Part 5 of the complete database migration
-- Run this after Part 4 (RLS policies) is complete
-- =====================================================

-- =====================================================
-- STORAGE BUCKETS CREATION
-- =====================================================

-- User avatars bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'avatars', 
    'avatars', 
    true, 
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- User uploads bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'user-uploads', 
    'user-uploads', 
    true, 
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff']
) ON CONFLICT (id) DO NOTHING;

-- Generated images bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'generated-images', 
    'generated-images', 
    true, 
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Temporary reference images bucket (public access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'temp-references', 
    'temp-references', 
    false, 
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- =====================================================
-- AVATARS BUCKET POLICIES
-- =====================================================

-- Users can upload their own avatars
DROP POLICY IF EXISTS "avatar_insert_own" ON storage.objects;
CREATE POLICY "avatar_insert_own" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (
    bucket_id = 'avatars' AND 
    name LIKE ('users/' || auth.uid() || '/%')
);

-- Users can update their own avatars
DROP POLICY IF EXISTS "avatar_update_own" ON storage.objects;
CREATE POLICY "avatar_update_own" ON storage.objects 
FOR UPDATE TO authenticated 
USING (
    bucket_id = 'avatars' AND 
    name LIKE ('users/' || auth.uid() || '/%')
)
WITH CHECK (
    bucket_id = 'avatars' AND 
    name LIKE ('users/' || auth.uid() || '/%')
);

-- Users can delete their own avatars
DROP POLICY IF EXISTS "avatar_delete_own" ON storage.objects;
CREATE POLICY "avatar_delete_own" ON storage.objects 
FOR DELETE TO authenticated 
USING (
    bucket_id = 'avatars' AND 
    name LIKE ('users/' || auth.uid() || '/%')
);

-- Public can read all avatars
DROP POLICY IF EXISTS "avatar_read_public" ON storage.objects;
CREATE POLICY "avatar_read_public" ON storage.objects 
FOR SELECT TO public 
USING (bucket_id = 'avatars');

-- =====================================================
-- USER UPLOADS BUCKET POLICIES
-- =====================================================

-- Users can upload their own images
DROP POLICY IF EXISTS "user_uploads_insert_own" ON storage.objects;
CREATE POLICY "user_uploads_insert_own" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (
    bucket_id = 'user-uploads' AND 
    name LIKE ('uploads/' || auth.uid() || '/%')
);

-- Users can update their own images
DROP POLICY IF EXISTS "user_uploads_update_own" ON storage.objects;
CREATE POLICY "user_uploads_update_own" ON storage.objects 
FOR UPDATE TO authenticated 
USING (
    bucket_id = 'user-uploads' AND 
    name LIKE ('uploads/' || auth.uid() || '/%')
)
WITH CHECK (
    bucket_id = 'user-uploads' AND 
    name LIKE ('uploads/' || auth.uid() || '/%')
);

-- Users can delete their own images
DROP POLICY IF EXISTS "user_uploads_delete_own" ON storage.objects;
CREATE POLICY "user_uploads_delete_own" ON storage.objects 
FOR DELETE TO authenticated 
USING (
    bucket_id = 'user-uploads' AND 
    name LIKE ('uploads/' || auth.uid() || '/%')
);

-- Public can read all user uploads
DROP POLICY IF EXISTS "user_uploads_read_public" ON storage.objects;
CREATE POLICY "user_uploads_read_public" ON storage.objects 
FOR SELECT TO public 
USING (bucket_id = 'user-uploads');

-- =====================================================
-- GENERATED IMAGES BUCKET POLICIES
-- =====================================================

-- Users can upload their own generated images
DROP POLICY IF EXISTS "generated_images_insert_own" ON storage.objects;
CREATE POLICY "generated_images_insert_own" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (
    bucket_id = 'generated-images' AND 
    name LIKE ('generations/' || auth.uid() || '/%')
);

-- Users can update their own generated images
DROP POLICY IF EXISTS "generated_images_update_own" ON storage.objects;
CREATE POLICY "generated_images_update_own" ON storage.objects 
FOR UPDATE TO authenticated 
USING (
    bucket_id = 'generated-images' AND 
    name LIKE ('generations/' || auth.uid() || '/%')
)
WITH CHECK (
    bucket_id = 'generated-images' AND 
    name LIKE ('generations/' || auth.uid() || '/%')
);

-- Users can delete their own generated images
DROP POLICY IF EXISTS "generated_images_delete_own" ON storage.objects;
CREATE POLICY "generated_images_delete_own" ON storage.objects 
FOR DELETE TO authenticated 
USING (
    bucket_id = 'generated-images' AND 
    name LIKE ('generations/' || auth.uid() || '/%')
);

-- Public can read all generated images
DROP POLICY IF EXISTS "generated_images_read_public" ON storage.objects;
CREATE POLICY "generated_images_read_public" ON storage.objects 
FOR SELECT TO public 
USING (bucket_id = 'generated-images');

-- =====================================================
-- TEMP REFERENCES BUCKET POLICIES
-- =====================================================

-- Public access for temporary reference images (used for duplicate detection)
DROP POLICY IF EXISTS "temp_references_insert_all" ON storage.objects;
CREATE POLICY "temp_references_insert_all" ON storage.objects 
FOR INSERT TO public 
WITH CHECK (bucket_id = 'temp-references');

-- Public can read temp references
DROP POLICY IF EXISTS "temp_references_select_all" ON storage.objects;
CREATE POLICY "temp_references_select_all" ON storage.objects 
FOR SELECT TO public 
USING (bucket_id = 'temp-references');

-- Public can delete temp references
DROP POLICY IF EXISTS "temp_references_delete_all" ON storage.objects;
CREATE POLICY "temp_references_delete_all" ON storage.objects 
FOR DELETE TO public 
USING (bucket_id = 'temp-references');

-- Public can update temp references
DROP POLICY IF EXISTS "temp_references_update_all" ON storage.objects;
CREATE POLICY "temp_references_update_all" ON storage.objects 
FOR UPDATE TO public 
USING (bucket_id = 'temp-references')
WITH CHECK (bucket_id = 'temp-references');

-- =====================================================
-- STORAGE UTILITY FUNCTIONS
-- =====================================================

-- Function to get user's storage usage
DROP FUNCTION IF EXISTS get_user_storage_usage(uuid);
CREATE OR REPLACE FUNCTION get_user_storage_usage(p_user_id uuid) RETURNS TABLE(
    bucket_name text,
    file_count bigint,
    total_size bigint,
    bucket_size_limit bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.name::text,
        COUNT(o.id)::bigint,
        COALESCE(SUM(o.metadata->>'size')::bigint, 0),
        b.file_size_limit
    FROM storage.buckets b
    LEFT JOIN storage.objects o ON b.id = o.bucket_id
    WHERE b.id IN ('avatars', 'user-uploads', 'generated-images')
    AND (o.name LIKE ('users/' || p_user_id || '/%') 
         OR o.name LIKE ('uploads/' || p_user_id || '/%')
         OR o.name LIKE ('generations/' || p_user_id || '/%'))
    GROUP BY b.id, b.name, b.file_size_limit
    ORDER BY b.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old temporary files (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_temp_files() RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'temp-references' 
    AND created_at < now() - interval '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions for storage functions
GRANT EXECUTE ON FUNCTION get_user_storage_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_temp_files() TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if buckets were created successfully
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE id IN ('avatars', 'user-uploads', 'generated-images', 'temp-references')
ORDER BY id;

-- Check if storage policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION get_user_storage_usage(uuid) IS 'Gets storage usage statistics for a specific user';
COMMENT ON FUNCTION cleanup_old_temp_files() IS 'Removes temporary files older than 24 hours';

-- =====================================================
-- PART 5 COMPLETE
-- Next: Run migrate-to-new-schema-part6-finalize.sql
-- =====================================================
