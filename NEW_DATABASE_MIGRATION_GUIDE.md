# New Database Schema Migration Guide

## 🎯 **Overview**

This guide covers all the changes needed to migrate from the old complex database schema to the new clean, separated schema.

## 📋 **What's Changed**

### **1. Database Schema Changes**

#### **Old Schema Problems:**
- ❌ Overlapping functionality between `uploaded_images` and `user_assets`
- ❌ Complex triggers with multiple responsibilities
- ❌ Unclear separation between uploaded vs generated images
- ❌ Complex marketplace logic with source_type confusion

#### **New Schema Benefits:**
- ✅ **Separate tables**: `uploaded_images` vs `generated_images`
- ✅ **Clean triggers**: Single responsibility per trigger
- ✅ **Unified assets**: `user_assets` as a clean view
- ✅ **Simplified marketplace**: Direct asset references

### **2. Storage Bucket Changes**

#### **Old Buckets:**
- `custom-uploads` (mixed content)

#### **New Buckets:**
- `user-uploads` (for user-uploaded images)
- `generated-images` (for AI-generated content)
- `avatars` (for user profile pictures)
- `temp-references` (for temporary reference images)

### **3. Table Name Changes**

| Old Table | New Table | Purpose |
|-----------|-----------|---------|
| `mkt_profiles` | `profiles` | User profiles and credits |
| `mkt_listings` | `marketplace_listings` | Marketplace listings |
| `mkt_transactions` | `marketplace_transactions` | Purchase transactions |
| `custom_orders` | `custom_card_orders` | Physical card orders |

## 🔧 **Code Changes Required**

### **1. Updated Files (Already Done)**

✅ **`lib/supabase-storage.ts`**
- Updated to use new bucket names
- Added specialized functions: `uploadUserImage()`, `uploadGeneratedImage()`, `uploadTempReference()`
- Updated column names (`mime_type` instead of `file_type`)

✅ **`app/generate/page.tsx`**
- Updated to use `uploadGeneratedImage()` for AI generations
- Updated table references from `mkt_profiles` to `profiles`
- Updated temp reference functions

✅ **`hooks/use-credits.ts`**
- Updated to use `profiles` table
- Added support for `free_generations_used`

✅ **`app/upload/page.tsx`**
- Updated to use `uploadUserImage()` for user uploads
- Updated table references

✅ **`components/custom-card-checkout-modal.tsx`**
- Updated to use `uploadUserImage()` for custom card orders

✅ **`components/navigation.tsx`**
- Updated to use `profiles` table

### **2. Files Still Need Updates**

The following files still need to be updated to use the new table names:

#### **API Routes:**
- `app/api/webhooks/stripe-credits/route.ts`
- `app/api/create-payment-intent/route.ts`
- `app/api/seller/balance/route.ts`
- `app/api/stripe/status/route.ts`
- `app/api/stripe-webhook/route.ts`
- `app/api/refresh-stripe-status/route.ts`
- `app/api/stripe/onboard/route.ts`
- `app/api/stripe-connect-webhook/route.ts`
- `app/api/stripe/callback/route.ts`

#### **Pages:**
- `app/profile/page.tsx`
- `app/marketplace/page.tsx`
- `app/seller/[sellerId]/page.tsx`

#### **Components:**
- `components/AvatarUploader.tsx`

#### **Other:**
- `app/connect-stripe/route.ts`

### **3. Quick Update Pattern**

For each file that needs updating, replace:

```typescript
// OLD
.from("mkt_profiles")

// NEW
.from("profiles")
```

```typescript
// OLD
import { uploadToSupabase } from "@/lib/supabase-storage"
const { publicUrl } = await uploadToSupabase(file, path, opts)

// NEW
import { uploadUserImage } from "@/lib/supabase-storage"
const { publicUrl } = await uploadUserImage(file, path, metadata)
```

## 🚀 **Migration Steps**

### **Step 1: Apply New Schema**
```sql
-- Run the new schema file
-- cardify-clean-database.sql
```

### **Step 2: Update Remaining Code Files**
Update all the files listed in section 2 above to use new table names and functions.

### **Step 3: Test Thoroughly**
- Test user uploads
- Test AI generations
- Test marketplace functionality
- Test credits system
- Test Stripe integration

### **Step 4: Deploy**
Deploy the updated code to production.

## 📊 **Database Schema Summary**

### **Core Tables:**
- `profiles` - User profiles, credits, free generations
- `uploaded_images` - User-uploaded custom images
- `generated_images` - AI-generated images
- `user_assets` - Unified view of all user assets
- `marketplace_listings` - Active marketplace listings
- `marketplace_transactions` - Purchase transactions
- `custom_card_orders` - Physical card printing orders
- `credits_ledger` - Audit trail for all credit transactions

### **Storage Buckets:**
- `user-uploads` - User uploaded images
- `generated-images` - AI generated content
- `avatars` - User profile pictures
- `temp-references` - Temporary reference images

### **Key Functions:**
- `uploadUserImage()` - For user uploads
- `uploadGeneratedImage()` - For AI generations
- `uploadTempReference()` - For temporary references
- `deleteTempReference()` - Clean up temp files

## 🎉 **Benefits of New Schema**

1. **Clear Separation**: Uploaded vs generated images are completely separate
2. **Simplified Logic**: No more complex source_type handling
3. **Better Performance**: Optimized indexes and materialized views
4. **Easier Maintenance**: Single responsibility triggers and functions
5. **Cleaner Code**: Specialized upload functions for different use cases
6. **Better Scalability**: Proper storage organization by content type

## ⚠️ **Important Notes**

- The new schema is **idempotent** - you can run it multiple times safely
- All triggers and functions are **backward compatible**
- The migration preserves all existing functionality
- Storage files need to be moved manually (see migration script)
- Test thoroughly before deploying to production

## 🔍 **Verification Queries**

After migration, run these queries to verify everything is working:

```sql
-- Check table counts
SELECT 'profiles' as table_name, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'uploaded_images', COUNT(*) FROM public.uploaded_images
UNION ALL
SELECT 'generated_images', COUNT(*) FROM public.generated_images
UNION ALL
SELECT 'user_assets', COUNT(*) FROM public.user_assets
UNION ALL
SELECT 'marketplace_listings', COUNT(*) FROM public.marketplace_listings;

-- Check storage buckets
SELECT * FROM storage.buckets WHERE id IN ('user-uploads', 'generated-images', 'avatars', 'temp-references');
```

This migration will make your database much cleaner, more efficient, and easier to maintain!
