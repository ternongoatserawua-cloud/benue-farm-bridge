-- ==============================================================================
-- BENUE AGRICULTURAL MARKETPLACE - CRITICAL SCHEMA FIX FOR ROLE & STATUS CONSTRAINTS
-- Migration: 20241004_fix_profiles_and_products_status_columns.sql
-- ==============================================================================
-- Resolves:
-- 1. "Could not find the 'status' column of 'profiles' in the schema cache"
-- 2. "new row for relation 'profiles' violates check constraint 'profiles_role_check'"
-- 
-- ROOT CAUSE IDENTIFIED & FIXED:
-- 1. The original 'profiles_role_check' constraint in PostgreSQL only allowed
--    ('buyer', 'seller'). When an account with role 'admin', 'super_admin', or
--    'farmer' was created or backfilled, PostgreSQL aborted with error 23514.
--    FIX: Step 1 drops and recreates the role check constraint FIRST before any inserts.
-- 2. The 'status' column was missing on 'public.profiles' in the live database.
--    FIX: Step 2 adds 'status' with default 'active' and creates appropriate constraints.
-- 3. The 'status', 'status_note', and 'recycled_at' columns were missing on 'public.products'.
--    FIX: Step 3 adds these columns to 'public.products'.
-- ==============================================================================

-- 1. UPDATE ROLE CHECK CONSTRAINT ON PROFILES
-- Clean any invalid/empty roles first so adding constraint never fails
UPDATE public.profiles
SET role = 'buyer'
WHERE role IS NULL OR role NOT IN ('buyer', 'seller', 'farmer', 'admin', 'super_admin');

-- Drop legacy check constraint that only allowed ('buyer', 'seller') and permit all system roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('buyer', 'seller', 'farmer', 'admin', 'super_admin'));

-- 2. ADD MISSING STATUS & PROFILE COLUMNS TO PUBLIC.PROFILES
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

UPDATE public.profiles
SET status = 'active'
WHERE status IS NULL OR status NOT IN ('active', 'suspended', 'banned');

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('active', 'suspended', 'banned'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_image TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. ADD MISSING STATUS & MODERATION COLUMNS TO PUBLIC.PRODUCTS
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';

UPDATE public.products
SET status = 'approved'
WHERE status IS NULL OR status NOT IN ('pending', 'approved', 'rejected', 'recycled');

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'recycled'));

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status_note TEXT DEFAULT '';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS recycled_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_recycled_at ON public.products(recycled_at);

-- 4. BACKFILL ANY MISSING AUTH.USERS INTO PUBLIC.PROFILES WITH VALIDATED ROLES
INSERT INTO public.profiles (
  id,
  full_name,
  email,
  phone,
  role,
  status,
  location,
  lga,
  verified,
  created_at,
  updated_at
)
SELECT
  u.id,
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
    split_part(u.email, '@', 1),
    'Market User'
  ),
  u.email,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'phone'), ''), ''),
  CASE
    WHEN LOWER(TRIM(u.raw_user_meta_data->>'role')) IN ('admin', 'super_admin', 'farmer', 'seller', 'buyer') THEN LOWER(TRIM(u.raw_user_meta_data->>'role'))
    ELSE 'buyer'
  END,
  'active',
  'Benue State',
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'lga'), ''), 'Makurdi'),
  CASE WHEN (u.raw_user_meta_data->>'role') IN ('admin', 'super_admin') THEN TRUE ELSE FALSE END,
  COALESCE(u.created_at, NOW()),
  NOW()
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  status = COALESCE(public.profiles.status, 'active'),
  role = CASE 
    WHEN public.profiles.role IN ('buyer', 'seller', 'farmer', 'admin', 'super_admin') THEN public.profiles.role
    ELSE EXCLUDED.role
  END,
  updated_at = NOW();

-- 5. DEDICATED SUPER ADMIN / ADMIN USER DELETION RPC
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_role TEXT;
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Caller role resolution
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL THEN
    v_caller_role := auth.jwt()->'user_metadata'->>'role';
  END IF;

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Permission Denied: Only administrators can delete user accounts.';
  END IF;

  -- Prevent deleting oneself
  IF auth.uid() = p_user_id THEN
    RAISE EXCEPTION 'Action Denied: You cannot delete your own active administrator account.';
  END IF;

  -- Target user info
  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;

  -- Regular Admin cannot delete other Admins or Super Admins
  IF v_caller_role = 'admin' AND v_target_role IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Permission Denied: Only Super Admin can delete administrator accounts.';
  END IF;

  -- 1. Delete associated products safely if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    DELETE FROM public.products WHERE seller_id = p_user_id;
  END IF;

  -- 2. Delete associated saved products bookmarks safely if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saved_products') THEN
    DELETE FROM public.saved_products WHERE user_id = p_user_id;
  END IF;

  -- 3. Delete from payment transactions safely if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_transactions') THEN
    DELETE FROM public.payment_transactions WHERE vendor_id = p_user_id;
  END IF;

  -- 4. Delete profile
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- 5. Delete from auth.users (cascades any remaining auth sessions)
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'User account deleted permanently.'
  );
END;
$$;

ALTER FUNCTION public.admin_delete_user(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

-- 6. NOTIFY POSTGREST TO RELOAD ITS SCHEMA CACHE IMMEDIATELY
NOTIFY pgrst, 'reload schema';
