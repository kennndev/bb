-- =====================================================
-- ADD ADMIN USER
-- Simple script to add admin users to the Cardify platform
-- =====================================================

-- =====================================================
-- 1. ADD ADMIN TO ADMINS TABLE
-- =====================================================

-- Add admin user (replace with actual user ID and email)
INSERT INTO public.admins (user_id, email, created_at) 
VALUES (
    '972d309b-dd37-4b3c-8fce-673d80985d08',  -- Replace with actual user ID
    'placeparks@gmail.com',                   -- Replace with actual email
    NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    created_at = EXCLUDED.created_at;

-- =====================================================
-- 2. UPDATE PROFILE TO MARK AS ADMIN
-- =====================================================

-- Mark user as admin in profiles table
UPDATE public.profiles 
SET is_admin = TRUE 
WHERE id = '972d309b-dd37-4b3c-8fce-673d80985d08';  -- Replace with actual user ID

-- =====================================================
-- 3. VERIFY ADMIN ACCESS
-- =====================================================

-- Check if admin was added successfully
SELECT 
    a.user_id,
    a.email,
    a.created_at,
    p.display_name,
    p.is_admin
FROM public.admins a
JOIN public.profiles p ON a.user_id = p.id
WHERE a.user_id = '972d309b-dd37-4b3c-8fce-673d80985d08';  -- Replace with actual user ID

-- =====================================================
-- 4. USAGE INSTRUCTIONS
-- =====================================================

/*
To use this script:

1. Replace '8c978aba-b2b8-449e-a7d6-79b8b3fb71d7' with the actual user ID
2. Replace 'mirachannan@gmail.com' with the actual email address
3. Run the script in your Supabase SQL editor or psql

To find a user ID:
- Go to Supabase Dashboard > Authentication > Users
- Copy the user ID from the user you want to make admin

To add multiple admins:
- Copy the INSERT and UPDATE statements
- Change the user_id and email for each admin
- Run all statements together

The script includes:
- ON CONFLICT handling to prevent duplicate entries
- Profile table update to set is_admin flag
- Verification query to confirm admin access
*/
