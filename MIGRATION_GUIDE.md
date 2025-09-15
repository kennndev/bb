# Cardify Database Migration Guide

## Overview

This guide will help you set up a new Cardify database with the updated credit system:

- **10 credits per upload** (after initial 25 free uploads)
- **25 max limit of uploads per user** (free tier)
- **100 credits for 10 additional uploads** (after reaching the 25 limit)

## Files Included

1. **`database-schema.sql`** - Complete database structure with tables and indexes
2. **`database-functions-triggers.sql`** - All database functions and triggers
3. **`database-rls-policies.sql`** - Row Level Security policies
4. **`MIGRATION_GUIDE.md`** - This migration guide

## Prerequisites

- Supabase project set up
- Access to Supabase SQL editor
- Basic understanding of PostgreSQL

## Step-by-Step Migration

### Step 1: Create Storage Buckets

First, create the required storage buckets in your Supabase dashboard:

1. Go to **Storage** → **Buckets**
2. Create the following buckets:

```
avatars (public)
├── Public bucket for user profile pictures
├── RLS enabled
└── File size limit: 5MB

user-uploads (public)
├── Public bucket for user uploaded images
├── RLS enabled
└── File size limit: 10MB

generated-images (public)
├── Public bucket for AI generated images
├── RLS enabled
└── File size limit: 10MB

temp-references (private)
├── Private bucket for temporary reference images
├── RLS enabled
└── File size limit: 5MB
```

### Step 2: Run Database Schema

1. Open **SQL Editor** in your Supabase dashboard
2. Copy and paste the contents of `database-schema.sql`
3. Click **Run** to execute

This will create:
- All tables with proper relationships
- Indexes for performance
- Table comments for documentation

### Step 3: Run Functions and Triggers

1. In the same SQL Editor (or new query)
2. Copy and paste the contents of `database-functions-triggers.sql`
3. Click **Run** to execute

This will create:
- Credit management functions
- Upload credit checking functions
- Asset sync functions
- All necessary triggers

### Step 4: Run RLS Policies

1. In the same SQL Editor (or new query)
2. Copy and paste the contents of `database-rls-policies.sql`
3. Click **Run** to execute

This will create:
- Row Level Security policies for all tables
- User access controls
- Admin privileges

### Step 5: Set Up Storage Policies

In your Supabase dashboard, go to **Storage** → **Policies** and apply these policies:

#### Avatars Bucket

```sql
-- Users can upload their own avatars
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own avatars
CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own avatars
CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Public can read all avatars
CREATE POLICY "Public can read avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');
```

#### User Uploads Bucket

```sql
-- Users can upload their own images
CREATE POLICY "Users can upload own images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user-uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own images
CREATE POLICY "Users can update own images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user-uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own images
CREATE POLICY "Users can delete own images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user-uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Public can read all images
CREATE POLICY "Public can read user uploads" ON storage.objects
FOR SELECT USING (bucket_id = 'user-uploads');
```

#### Generated Images Bucket

```sql
-- Users can upload their own generated images
CREATE POLICY "Users can upload own generated images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'generated-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own generated images
CREATE POLICY "Users can update own generated images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'generated-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own generated images
CREATE POLICY "Users can delete own generated images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'generated-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Public can read all generated images
CREATE POLICY "Public can read generated images" ON storage.objects
FOR SELECT USING (bucket_id = 'generated-images');
```

#### Temp References Bucket

```sql
-- Public access for temporary reference images
CREATE POLICY "Public can manage temp references" ON storage.objects
FOR ALL USING (bucket_id = 'temp-references');
```

### Step 6: Verify Setup

Run these queries to verify everything is set up correctly:

```sql
-- Check tables
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check functions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;

-- Check triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
ORDER BY event_object_table, trigger_name;

-- Check policies
SELECT schemaname, tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

## New Credit System Details

### How It Works

1. **First 25 uploads**: Free (no credits required)
2. **After 25 uploads**: User must purchase upload packages
3. **Upload package**: 100 credits for 10 uploads
4. **Package consumption**: Automatically consumed when uploading

### Database Functions

- `can_user_upload(user_id)` - Checks if user can upload
- `purchase_upload_package(user_id, package_size, credits_cost)` - Buys upload package
- `consume_upload_from_package(user_id)` - Uses one upload from package

### Example Usage

```sql
-- Check if user can upload
SELECT * FROM can_user_upload('user-uuid-here');

-- Purchase upload package (100 credits for 10 uploads)
SELECT purchase_upload_package('user-uuid-here', 10, 100);

-- Check remaining uploads
SELECT upload_count, upload_package_count FROM profiles WHERE id = 'user-uuid-here';
```

## Frontend Integration

### Upload Flow

1. **Before upload**: Check `can_user_upload(user_id)`
2. **If needs package**: Show purchase option
3. **If has package**: Proceed with upload
4. **After upload**: Package automatically consumed

### Error Handling

The system will throw these errors:
- `upload_limit_reached_purchase_required` - User needs to buy package
- `upload_package_exhausted` - Package is empty
- `insufficient_credits` - Not enough credits for generation

### Frontend Error Messages

```typescript
// Handle upload errors
if (error.message === 'upload_limit_reached_purchase_required') {
  showMessage('Upload limit reached. Purchase 10 uploads for 100 credits.');
} else if (error.message === 'upload_package_exhausted') {
  showMessage('Upload package exhausted. Purchase another package.');
}
```

## Testing the System

### Test Scenarios

1. **New user uploads** (should work for first 25)
2. **User reaches limit** (should get error message)
3. **User purchases package** (should work for 10 more uploads)
4. **Package exhausted** (should get error message)

### Test Queries

```sql
-- Simulate user reaching upload limit
UPDATE profiles SET upload_count = 25 WHERE id = 'test-user-id';

-- Check upload status
SELECT * FROM can_user_upload('test-user-id');

-- Purchase package
SELECT purchase_upload_package('test-user-id', 10, 100);

-- Check package status
SELECT * FROM upload_packages WHERE user_id = 'test-user-id';
```

## Troubleshooting

### Common Issues

1. **RLS policies not working**: Ensure policies are created and enabled
2. **Triggers not firing**: Check if functions exist and triggers are attached
3. **Storage access denied**: Verify storage bucket policies are correct
4. **Credit functions failing**: Check if user has proper permissions

### Debug Queries

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check trigger status
SELECT tgname, tgrelid::regclass, tgenabled 
FROM pg_trigger 
WHERE tgrelid::regclass::text LIKE 'public.%';

-- Check function permissions
SELECT routine_name, routine_type, security_type 
FROM information_schema.routines 
WHERE routine_schema = 'public';
```

## Support

If you encounter issues during migration:

1. Check the Supabase logs for error messages
2. Verify all SQL files executed successfully
3. Ensure storage buckets and policies are set up correctly
4. Test with a simple user upload to verify the flow

## Next Steps

After successful migration:

1. Update your frontend code to handle the new credit system
2. Test the upload flow with the new limits
3. Implement the package purchase UI
4. Monitor the system for any issues

The new credit system provides a sustainable model for your platform while maintaining user experience for new users.
