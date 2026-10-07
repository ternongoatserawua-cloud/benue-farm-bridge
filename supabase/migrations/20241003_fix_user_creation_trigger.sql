-- ==============================================================================
-- BENUE AGRICULTURAL MARKETPLACE - CRITICAL FIX FOR USER CREATION TRIGGER
-- Migration: 20241003_fix_user_creation_trigger.sql
-- ==============================================================================
-- Resolves the "Database error saving new user" error on user registration/admin creation.
-- 
-- ROOT CAUSE IDENTIFIED:
-- 1. In handle_new_user(), the ON CONFLICT clause used "public.profiles.phone"
--    and "public.profiles.role". In PostgreSQL, schema-qualified table names in
--    ON CONFLICT DO UPDATE SET expressions cause syntax/table reference errors.
-- 2. Lack of "SET search_path = public, auth, pg_temp" in SECURITY DEFINER function.
-- 3. Lack of an EXCEPTION block in handle_new_user() meant ANY minor profile insertion
--    issue immediately failed the whole auth.users insert transaction.
-- 4. Missing grants to supabase_auth_admin role on public.profiles.
-- ==============================================================================

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Grant necessary schema and table permissions to auth roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
GRANT ALL ON TABLE public.profiles TO postgres, service_role, supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO anon, authenticated;

-- 3. Robust, fault-tolerant handle_new_user() trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_full_name TEXT;
  v_role      TEXT;
  v_status    TEXT;
  v_phone     TEXT;
  v_lga       TEXT;
  v_location  TEXT;
  v_avatar    TEXT;
BEGIN
  -- Extract and sanitize metadata values with safe fallbacks
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1),
    'Market User'
  );

  v_role := COALESCE(
    NULLIF(TRIM(LOWER(NEW.raw_user_meta_data->>'role')), ''),
    'buyer'
  );
  -- Validate role against check constraint
  IF v_role NOT IN ('buyer', 'seller', 'farmer', 'admin', 'super_admin') THEN
    v_role := 'buyer';
  END IF;

  v_status := COALESCE(
    NULLIF(TRIM(LOWER(NEW.raw_user_meta_data->>'status')), ''),
    'active'
  );
  IF v_status NOT IN ('active', 'suspended', 'banned') THEN
    v_status := 'active';
  END IF;

  v_phone := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''), '');
  v_lga := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'lga'), ''), 'Ukum');
  v_location := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'location'), ''), 'Benue State');
  v_avatar := COALESCE(NEW.raw_user_meta_data->>'avatar_url', '');

  -- Upsert profile record
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    phone,
    role,
    status,
    lga,
    location,
    avatar_url,
    verified,
    updated_at
  ) VALUES (
    NEW.id,
    v_full_name,
    NEW.email,
    v_phone,
    v_role,
    v_status,
    v_lga,
    v_location,
    v_avatar,
    CASE WHEN v_role IN ('admin', 'super_admin') THEN TRUE ELSE FALSE END,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name   = EXCLUDED.full_name,
    email       = EXCLUDED.email,
    phone       = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
    role        = COALESCE(NULLIF(EXCLUDED.role, ''), profiles.role),
    status      = COALESCE(NULLIF(EXCLUDED.status, ''), profiles.status),
    lga         = COALESCE(NULLIF(EXCLUDED.lga, ''), profiles.lga),
    location    = COALESCE(NULLIF(EXCLUDED.location, ''), profiles.location),
    verified    = CASE WHEN EXCLUDED.role IN ('admin', 'super_admin') THEN TRUE ELSE profiles.verified END,
    updated_at  = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- CRITICAL: Never abort auth.users transaction if profile creation has an edge-case error.
  -- Log the error so it shows in Supabase Database logs.
  RAISE WARNING 'handle_new_user trigger error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Set ownership to postgres superuser
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 4. Re-bind the trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Dedicated RPC for Super Admin to create Admin accounts directly
-- This bypasses client-side session overwrites and auto-confirms email.
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email     TEXT,
  p_password  TEXT,
  p_full_name TEXT,
  p_phone     TEXT DEFAULT '',
  p_role      TEXT DEFAULT 'admin',
  p_lga       TEXT DEFAULT 'Makurdi'
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_caller_role TEXT;
  v_user_id     UUID;
  v_clean_email TEXT;
  v_clean_role  TEXT;
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if caller is super_admin
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
    -- Also allow if JWT role metadata is super_admin
    IF (auth.jwt()->'user_metadata'->>'role') IS DISTINCT FROM 'super_admin' THEN
      RAISE EXCEPTION 'Access Denied: Only Super Admin can create administrators.';
    END IF;
  END IF;

  v_clean_email := LOWER(TRIM(p_email));
  v_clean_role := LOWER(TRIM(p_role));
  IF v_clean_role NOT IN ('admin', 'super_admin', 'farmer', 'buyer') THEN
    v_clean_role := 'admin';
  END IF;

  -- Check if user already exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = v_clean_email;

  IF v_user_id IS NOT NULL THEN
    -- User exists: Update password, metadata, and promote role
    UPDATE auth.users
    SET
      encrypted_password = crypt(p_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
        'full_name', p_full_name,
        'name', p_full_name,
        'phone', p_phone,
        'role', v_clean_role,
        'status', 'active',
        'lga', p_lga
      ),
      updated_at = NOW()
    WHERE id = v_user_id;

    -- Upsert profile
    INSERT INTO public.profiles (
      id, full_name, email, phone, role, status, lga, location, verified, updated_at
    ) VALUES (
      v_user_id, p_full_name, v_clean_email, p_phone, v_clean_role, 'active', p_lga, 'Benue State', TRUE, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      status = 'active',
      phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
      verified = TRUE,
      updated_at = NOW();

    RETURN jsonb_build_object(
      'success', true,
      'user_id', v_user_id,
      'email', v_clean_email,
      'role', v_clean_role,
      'message', 'Existing user promoted to ' || v_clean_role
    );
  ELSE
    -- User does not exist: Create new auth.users record
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_clean_email,
      crypt(p_password, gen_salt('bf')),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object(
        'full_name', p_full_name,
        'name', p_full_name,
        'phone', p_phone,
        'role', v_clean_role,
        'status', 'active',
        'lga', p_lga
      ),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      encode(gen_random_bytes(32), 'hex')
    );

    -- Upsert profile
    INSERT INTO public.profiles (
      id, full_name, email, phone, role, status, lga, location, verified, created_at, updated_at
    ) VALUES (
      v_user_id, p_full_name, v_clean_email, p_phone, v_clean_role, 'active', p_lga, 'Benue State', TRUE, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      status = 'active',
      verified = TRUE,
      updated_at = NOW();

    RETURN jsonb_build_object(
      'success', true,
      'user_id', v_user_id,
      'email', v_clean_email,
      'role', v_clean_role,
      'message', 'New ' || v_clean_role || ' created successfully'
    );
  END IF;
END;
$$;

-- Grant execute on the RPC to authenticated users (internal checks enforce super_admin)
GRANT EXECUTE ON FUNCTION public.admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
