-- ==============================================================================
-- BENUE AGRICULTURAL MARKETPLACE - RLS POLICIES FIX FOR PROFILES & STORAGE
-- Migration: 20241005_fix_profiles_rls_policies.sql
-- ==============================================================================
-- Resolves: "new row violates row-level security policy for table 'profiles'"
-- 
-- ROOT CAUSE IDENTIFIED & FIXED:
-- 1. When updating a profile or changing an avatar, clients performing an upsert
--    or insert triggered default-deny on the INSERT RLS policy of public.profiles.
-- 2. This migration explicitly grants INSERT and UPDATE permissions to authenticated
--    users for their own profile rows (auth.uid() = id).
-- 3. Grants administrators permission to update any profile.
-- 4. Ensures the storage 'avatars' bucket exists with public read and authenticated write.
-- ==============================================================================

-- 1. Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. SELECT Policy: Public can view all profiles (needed for storefront & farmer directory)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

-- 3. INSERT Policy: Authenticated users can insert their own profile record (matching auth.uid)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 4. UPDATE Policy: Users can update their own profile, or admins can update any profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- 5. STORAGE BUCKET CONFIGURATION & RLS FOR AVATARS
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure produce-images bucket exists as well
INSERT INTO storage.buckets (id, name, public)
VALUES ('produce-images', 'produce-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Read Policy: Public can view avatars and produce images
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
DROP POLICY IF EXISTS "Produce images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public avatar and media access" ON storage.objects;
CREATE POLICY "Public avatar and media access"
ON storage.objects FOR SELECT
USING (bucket_id IN ('avatars', 'produce-images'));

-- Storage Upload Policy: Authenticated users can upload avatars and produce images
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload produce images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('avatars', 'produce-images'));

-- Storage Update Policy: Authenticated users can update/replace their own avatars & images
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update produce images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update media" ON storage.objects;
CREATE POLICY "Authenticated users can update media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id IN ('avatars', 'produce-images'));

-- Storage Delete Policy: Authenticated users can delete their media
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete produce images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete media" ON storage.objects;
CREATE POLICY "Authenticated users can delete media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id IN ('avatars', 'produce-images'));

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
