-- ==============================================================================
-- BENUE AGRICULTURAL MARKETPLACE - DUAL ROLE: BUYER / FARMER
-- Migration: 20241006_allow_buyer_farmer_role.sql
-- ==============================================================================
-- Purpose:
-- Allows buyers who activate a farmer account to have the dual role 'buyer/farmer'.
-- This preserves full buyer capabilities (bookmarking, purchasing) while giving
-- full farmer privileges (listing produce, seller dashboard).
-- ==============================================================================

-- 1. Update check constraint on profiles to permit 'buyer/farmer'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('buyer', 'seller', 'farmer', 'buyer/farmer', 'admin', 'super_admin'));

-- 2. Ensure RLS UPDATE policy continues to allow users to update their own profile
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

-- 3. Reload schema cache
NOTIFY pgrst, 'reload schema';
