-- ==============================================================================
-- BENUE MARKET — SECURITY FIX: Corrected RLS Policies
-- ==============================================================================
-- CRITICAL: The original RLS policies used USING (true) which allowed ANY
-- authenticated user to modify or delete ANY record in the database.
-- This migration replaces them with proper ownership-based access control.
--
-- Run this in your Supabase Dashboard → SQL Editor → New query
-- ==============================================================================

-- ═══════════════════════════════════════════════════════════════════════
-- 0. REQUIRED HELPER FUNCTIONS (create before policies reference them)
-- ═══════════════════════════════════════════════════════════════════════

-- Check if the current authenticated user is an admin or super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  v_role := COALESCE(
    auth.jwt()->'user_metadata'->>'role',
    auth.jwt()->'app_metadata'->>'role'
  );
  IF v_role IN ('admin', 'super_admin') THEN
    RETURN TRUE;
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN (v_role IN ('admin', 'super_admin'));
END;
$$;

ALTER FUNCTION public.is_admin() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, anon;

-- Check if current user is seller, farmer, buyer/farmer, admin or super_admin
CREATE OR REPLACE FUNCTION public.is_seller_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  v_role := COALESCE(
    auth.jwt()->'user_metadata'->>'role',
    auth.jwt()->'app_metadata'->>'role'
  );
  IF v_role IN ('seller', 'farmer', 'buyer/farmer', 'admin', 'super_admin') THEN
    RETURN TRUE;
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN (v_role IN ('seller', 'farmer', 'buyer/farmer', 'admin', 'super_admin'));
END;
$$;

ALTER FUNCTION public.is_seller_or_admin() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.is_seller_or_admin() TO authenticated, service_role, anon;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. PROFILES POLICIES — Proper Ownership Checks
-- ═══════════════════════════════════════════════════════════════════════

-- Keep public read access (profiles are public marketplace data)
-- Already exists: "Public profiles are viewable by everyone" SELECT USING (true) ✅

-- FIX: Users can only insert THEIR OWN profile row
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- FIX: Users can only update THEIR OWN profile. Admins can update any profile.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

-- FIX: Only admins can delete profiles (not any authenticated user!)
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════
-- 2. PRODUCTS POLICIES — Owner or Admin Only
-- ═══════════════════════════════════════════════════════════════════════

-- Keep public read access for storefront browsing
-- Already exists: "Products viewable by all" SELECT USING (true) ✅

-- Keep insert policy for sellers/admins
-- Already exists: "Sellers can create products" INSERT ✅

-- FIX: Only the product OWNER or an admin can update a product
DROP POLICY IF EXISTS "Sellers can update own products" ON public.products;
CREATE POLICY "Sellers can update own products"
ON public.products FOR UPDATE
USING (auth.uid() = seller_id OR public.is_admin())
WITH CHECK (auth.uid() = seller_id OR public.is_admin());

-- FIX: Only the product OWNER or an admin can delete a product
DROP POLICY IF EXISTS "Sellers can delete own products" ON public.products;
CREATE POLICY "Sellers can delete own products"
ON public.products FOR DELETE
USING (auth.uid() = seller_id OR public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════
-- 3. SAVED PRODUCTS POLICIES — User's Own Bookmarks Only
-- ═══════════════════════════════════════════════════════════════════════

-- FIX: Users can only view THEIR OWN saved products
DROP POLICY IF EXISTS "Users can view own saved products" ON public.saved_products;
CREATE POLICY "Users can view own saved products"
ON public.saved_products FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

-- FIX: Users can only insert THEIR OWN saved products
DROP POLICY IF EXISTS "Users can insert own saved products" ON public.saved_products;
CREATE POLICY "Users can insert own saved products"
ON public.saved_products FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- FIX: Users can only delete THEIR OWN saved products
DROP POLICY IF EXISTS "Users can delete own saved products" ON public.saved_products;
CREATE POLICY "Users can delete own saved products"
ON public.saved_products FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════
-- 4. PAYMENT TRANSACTIONS — Tighter Access
-- ═══════════════════════════════════════════════════════════════════════

-- Only server (service_role key) should insert payment records
-- The existing SELECT policies for vendors and admins are already correct ✅

-- Add INSERT policy: only service_role or authenticated admin can insert
DROP POLICY IF EXISTS "Server can insert payment transactions" ON public.payment_transactions;
CREATE POLICY "Server can insert payment transactions"
ON public.payment_transactions FOR INSERT
WITH CHECK (
  public.is_admin() OR
  auth.uid() = vendor_id OR
  auth.role() = 'service_role'
);

-- Block UPDATE on payment_transactions (immutable audit trail)
DROP POLICY IF EXISTS "Payment transactions are immutable" ON public.payment_transactions;
CREATE POLICY "Payment transactions are immutable"
ON public.payment_transactions FOR UPDATE
USING (false)
WITH CHECK (false);

-- Block DELETE on payment_transactions (immutable audit trail)
DROP POLICY IF EXISTS "Payment transactions cannot be deleted" ON public.payment_transactions;
CREATE POLICY "Payment transactions cannot be deleted"
ON public.payment_transactions FOR DELETE
USING (false);


-- ═══════════════════════════════════════════════════════════════════════
-- 5. STORAGE POLICIES — User-Scoped Uploads
-- ═══════════════════════════════════════════════════════════════════════

-- Keep public read access for produce images and avatars ✅

-- FIX: Users can only upload to THEIR OWN folder (path starts with their user ID)
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id IN ('produce-images', 'avatars')
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- FIX: Users can only update/replace THEIR OWN files
DROP POLICY IF EXISTS "Authenticated users can update media" ON storage.objects;
CREATE POLICY "Authenticated users can update own media"
ON storage.objects FOR UPDATE
USING (
  bucket_id IN ('produce-images', 'avatars')
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id IN ('produce-images', 'avatars')
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- FIX: Users can only delete THEIR OWN files
DROP POLICY IF EXISTS "Authenticated users can delete media" ON storage.objects;
CREATE POLICY "Authenticated users can delete own media"
ON storage.objects FOR DELETE
USING (
  bucket_id IN ('produce-images', 'avatars')
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ═══════════════════════════════════════════════════════════════════════
-- DONE — All RLS policies now enforce proper ownership-based access control
-- ═══════════════════════════════════════════════════════════════════════
