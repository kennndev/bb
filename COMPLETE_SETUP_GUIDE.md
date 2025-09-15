# 🚀 Cardify Complete Database Setup Guide

## 📋 Overview

This guide will help you set up your new Cardify database with the updated credit system and all storage buckets. Follow the steps in order to ensure everything works correctly.

## 📁 Files You Need

1. **`database-schema.sql`** - Database structure and tables
2. **`database-functions-triggers.sql`** - All database functions and triggers
3. **`database-rls-policies.sql`** - Row Level Security policies
4. **`storage-setup.sql`** - Storage buckets and policies ⭐ **NEW**
5. **`upload-credit-logic.sql`** - Upload credit system
6. **`upload-credit-testing.sql`** - Testing and examples

## 🔄 Execution Order (CRITICAL!)

**⚠️ IMPORTANT: Run these files in EXACTLY this order!**

### Step 1: Database Schema
```sql
-- Run this FIRST
-- Creates all tables, indexes, and basic structure
-- File: database-schema.sql
```

### Step 2: Functions & Triggers
```sql
-- Run this SECOND
-- Creates all database functions and triggers
-- File: database-functions-triggers.sql
```

### Step 3: RLS Policies
```sql
-- Run this THIRD
-- Creates Row Level Security policies
-- File: database-rls-policies.sql
```

### Step 4: Storage Setup ⭐
```sql
-- Run this FOURTH
-- Creates storage buckets and policies
-- File: storage-setup.sql
```

### Step 5: Upload Credit System
```sql
-- Run this LAST
-- Creates the upload credit logic
-- File: upload-credit-logic.sql
```

## 🗄️ What Each File Does

### `database-schema.sql`
- ✅ Creates all tables (`profiles`, `upload_packages`, `user_assets`, etc.)
- ✅ Sets up indexes for performance
- ✅ Establishes foreign key relationships
- ✅ Adds table comments for documentation

### `database-functions-triggers.sql`
- ✅ Creates credit management functions
- ✅ Sets up asset sync functions
- ✅ Creates marketplace functions
- ✅ Establishes all necessary triggers

### `database-rls-policies.sql`
- ✅ Enables Row Level Security on all tables
- ✅ Creates user access policies
- ✅ Sets up admin privileges
- ✅ Secures data access

### `storage-setup.sql` ⭐ **NEW**
- ✅ Creates 4 storage buckets:
  - `avatars` (5MB, public read)
  - `user-uploads` (10MB, public read)
  - `generated-images` (10MB, public read)
  - `temp-references` (5MB, private)
- ✅ Sets up storage policies for each bucket
- ✅ Creates cleanup triggers for orphaned files
- ✅ Adds utility functions for storage management

### `upload-credit-logic.sql`
- ✅ Implements the new credit system:
  - First 25 uploads: FREE
  - After 25: 100 credits for 10 uploads
- ✅ Creates automatic credit checking
- ✅ Sets up package management
- ✅ Handles all upload scenarios

## 🚀 How to Execute

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy and paste each file content
4. Click **Run** after each file
5. Wait for success confirmation before moving to next file

### Option 2: Command Line
```bash
# If you have psql access
psql -h your-host -U your-user -d your-database -f database-schema.sql
psql -h your-host -U your-user -d your-database -f database-functions-triggers.sql
psql -h your-host -U your-user -d your-database -f database-rls-policies.sql
psql -h your-host -U your-user -d your-database -f storage-setup.sql
psql -h your-host -U your-user -d your-database -f upload-credit-logic.sql
```

## ✅ Verification Steps

### After Each File, Verify:

#### 1. Schema File
```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

#### 2. Functions File
```sql
-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;
```

#### 3. RLS File
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

#### 4. Storage File ⭐
```sql
-- Check if buckets were created
SELECT id, name, public FROM storage.buckets 
WHERE id IN ('avatars', 'user-uploads', 'generated-images', 'temp-references');

-- Check if storage policies exist
SELECT policyname FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
```

#### 5. Upload Credit File
```sql
-- Check if upload functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%upload%';
```

## 🧪 Testing the System

After all files are executed, test with:

```sql
-- Test upload credit system
SELECT * FROM can_user_upload('your-user-id-here');
SELECT * FROM get_user_upload_status('your-user-id-here');

-- Test storage functions
SELECT * FROM get_user_storage_usage('your-user-id-here');
```

## 🚨 Common Issues & Solutions

### Issue: "Function does not exist"
**Solution:** Make sure you ran `database-functions-triggers.sql` before other files

### Issue: "Table does not exist"
**Solution:** Make sure you ran `database-schema.sql` first

### Issue: "Storage bucket not found"
**Solution:** Make sure you ran `storage-setup.sql` and check Supabase dashboard

### Issue: "RLS policy error"
**Solution:** Make sure you ran `database-rls-policies.sql` and RLS is enabled

## 📊 Expected Results

After successful execution, you should have:

- ✅ **25+ tables** in your database
- ✅ **20+ functions** for business logic
- ✅ **15+ triggers** for automation
- ✅ **4 storage buckets** with proper policies
- ✅ **Complete RLS** security setup
- ✅ **Upload credit system** ready to use

## 🔍 Monitoring & Maintenance

### Daily Checks
```sql
-- Check storage usage
SELECT bucket_id, COUNT(*) as file_count 
FROM storage.objects 
GROUP BY bucket_id;

-- Check upload statistics
SELECT 
    COUNT(*) as total_users,
    AVG(upload_count) as avg_uploads,
    SUM(upload_count) as total_uploads
FROM profiles;
```

### Weekly Maintenance
```sql
-- Clean up old temp files
SELECT cleanup_old_temp_files();

-- Check for orphaned storage
SELECT COUNT(*) FROM storage.objects o
LEFT JOIN uploaded_images ui ON o.name = ui.storage_path
WHERE o.bucket_id = 'user-uploads' AND ui.id IS NULL;
```

## 🎯 Next Steps

After successful setup:

1. **Test the upload system** with a few test users
2. **Monitor storage usage** in Supabase dashboard
3. **Implement frontend integration** using the provided functions
4. **Set up monitoring** for the credit system
5. **Train your team** on the new system

## 🆘 Need Help?

If you encounter issues:

1. Check the verification queries above
2. Look at Supabase logs for error messages
3. Ensure all files executed successfully
4. Verify the execution order was followed exactly

---

**🎉 Congratulations!** You now have a complete, production-ready Cardify database with the new upload credit system! 🚀
