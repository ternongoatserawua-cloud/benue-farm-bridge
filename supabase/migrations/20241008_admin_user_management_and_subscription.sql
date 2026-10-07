-- ==============================================================================
-- BENUE AGRICULTURAL MARKETPLACE — ADMIN USER MANAGEMENT & SUBSCRIPTION RPC
-- ==============================================================================
-- Allows Administrators and Super Administrators to:
--  1. Suspend / Unsuspend user accounts
--  2. Permanently Delete user accounts (with full cascade cleanup)
--  3. Revoke active user subscriptions
--  4. Grant / Set user subscriptions
--
-- Run this in your Supabase Project Dashboard → SQL Editor → New query
-- ==============================================================================

-- 1. Ensure required columns exist on public.profiles
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_payment_ref TEXT DEFAULT NULL;

-- 2. Robust Admin Check Helper Function (Security Definer - No RLS Recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Authenticated check
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Fast check via JWT metadata
  v_role := COALESCE(
    auth.jwt()->'user_metadata'->>'role',
    auth.jwt()->'app_metadata'->>'role'
  );
  IF v_role IN ('admin', 'super_admin') THEN
    RETURN TRUE;
  END IF;

  -- 2. Direct database profiles lookup
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN (v_role IN ('admin', 'super_admin'));
END;
$$;

ALTER FUNCTION public.is_admin() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, anon;


-- 3. RPC: Suspend / Reactivate User Account
CREATE OR REPLACE FUNCTION public.admin_suspend_user(
  p_user_id UUID,
  p_suspend BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_uid UUID;
  v_caller_role TEXT;
  v_target_role TEXT;
  v_new_status TEXT;
BEGIN
  v_caller_uid := auth.uid();

  -- Verify authentication
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: You must be logged in.';
  END IF;

  -- Resolve caller role
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_uid;
  IF v_caller_role IS NULL THEN
    v_caller_role := COALESCE(
      auth.jwt()->'user_metadata'->>'role',
      auth.jwt()->'app_metadata'->>'role'
    );
  END IF;

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Permission Denied: Only administrators can suspend or reactivate users.';
  END IF;

  -- Cannot suspend yourself
  IF v_caller_uid = p_user_id THEN
    RAISE EXCEPTION 'Action Denied: You cannot suspend your own administrator account.';
  END IF;

  -- Resolve target user role
  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;

  -- Regular Admin cannot suspend Super Admins or other Admins
  IF v_caller_role = 'admin' AND v_target_role IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Permission Denied: Only Super Admin can suspend other administrators.';
  END IF;

  v_new_status := CASE WHEN p_suspend THEN 'suspended' ELSE 'active' END;

  -- Update profiles status
  UPDATE public.profiles
  SET status = v_new_status,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- If suspended, also make sure their active listings are hidden from marketplace
  IF p_suspend THEN
    UPDATE public.products
    SET available = FALSE,
        updated_at = NOW()
    WHERE seller_id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'status', v_new_status,
    'message', CASE WHEN p_suspend THEN 'User account suspended successfully.' ELSE 'User account reactivated successfully.' END
  );
END;
$$;

ALTER FUNCTION public.admin_suspend_user(UUID, BOOLEAN) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.admin_suspend_user(UUID, BOOLEAN) TO authenticated, service_role;


-- 4. RPC: Permanently Delete User Account (Atomic Multi-table Cascade)
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_uid UUID;
  v_caller_role TEXT;
  v_target_role TEXT;
BEGIN
  v_caller_uid := auth.uid();

  -- Verify authentication
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: You must be logged in.';
  END IF;

  -- Resolve caller role
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_uid;
  IF v_caller_role IS NULL THEN
    v_caller_role := COALESCE(
      auth.jwt()->'user_metadata'->>'role',
      auth.jwt()->'app_metadata'->>'role'
    );
  END IF;

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Permission Denied: Only administrators can delete user accounts.';
  END IF;

  -- Cannot delete yourself
  IF v_caller_uid = p_user_id THEN
    RAISE EXCEPTION 'Action Denied: You cannot delete your own active administrator account.';
  END IF;

  -- Resolve target user role
  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;

  -- Regular Admin cannot delete other Admins or Super Admins
  IF v_caller_role = 'admin' AND v_target_role IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Permission Denied: Only Super Admin can delete administrator accounts.';
  END IF;

  -- Delete associated products
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    DELETE FROM public.products WHERE seller_id = p_user_id;
  END IF;

  -- Delete saved bookmarks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saved_products') THEN
    DELETE FROM public.saved_products WHERE user_id = p_user_id;
  END IF;

  -- Delete payment transactions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_transactions') THEN
    DELETE FROM public.payment_transactions WHERE vendor_id = p_user_id;
  END IF;

  -- Delete profile record
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- Delete auth user (cascades all sessions)
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'User account and associated records deleted permanently.'
  );
END;
$$;

ALTER FUNCTION public.admin_delete_user(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated, service_role;


-- 5. RPC: Revoke User Subscription
CREATE OR REPLACE FUNCTION public.admin_revoke_subscription(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_uid UUID;
  v_caller_role TEXT;
BEGIN
  v_caller_uid := auth.uid();

  -- Verify authentication
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: You must be logged in.';
  END IF;

  -- Resolve caller role
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_uid;
  IF v_caller_role IS NULL THEN
    v_caller_role := COALESCE(
      auth.jwt()->'user_metadata'->>'role',
      auth.jwt()->'app_metadata'->>'role'
    );
  END IF;

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Permission Denied: Only administrators can revoke user subscriptions.';
  END IF;

  -- Update profiles subscription fields
  UPDATE public.profiles
  SET subscription_plan = NULL,
      subscription_status = 'cancelled',
      subscription_expires_at = NOW(),
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'User subscription has been revoked successfully.'
  );
END;
$$;

ALTER FUNCTION public.admin_revoke_subscription(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.admin_revoke_subscription(UUID) TO authenticated, service_role;


-- 6. RPC: Grant / Set User Subscription
CREATE OR REPLACE FUNCTION public.admin_grant_subscription(
  p_user_id UUID,
  p_plan_id TEXT,
  p_duration_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_uid UUID;
  v_caller_role TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_expires TIMESTAMPTZ;
BEGIN
  v_caller_uid := auth.uid();

  -- Verify authentication
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: You must be logged in.';
  END IF;

  -- Resolve caller role
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_uid;
  IF v_caller_role IS NULL THEN
    v_caller_role := COALESCE(
      auth.jwt()->'user_metadata'->>'role',
      auth.jwt()->'app_metadata'->>'role'
    );
  END IF;

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Permission Denied: Only administrators can grant subscriptions.';
  END IF;

  v_expires := v_now + (COALESCE(p_duration_days, 30) || ' days')::INTERVAL;

  -- Update profiles subscription fields
  UPDATE public.profiles
  SET subscription_plan = p_plan_id,
      subscription_started_at = v_now,
      subscription_expires_at = v_expires,
      subscription_status = 'active',
      subscription_payment_ref = 'admin-granted',
      updated_at = v_now
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'plan_id', p_plan_id,
    'expires_at', v_expires,
    'message', 'Subscription granted successfully.'
  );
END;
$$;

ALTER FUNCTION public.admin_grant_subscription(UUID, TEXT, INTEGER) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.admin_grant_subscription(UUID, TEXT, INTEGER) TO authenticated, service_role;


-- 7. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
