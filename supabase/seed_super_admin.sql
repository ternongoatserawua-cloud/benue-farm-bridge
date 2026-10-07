-- ==============================================================================
-- BENUE AGRICULTURAL MARKETPLACE - SEED SUPER ADMIN SCRIPT
-- ==============================================================================
-- Run this in your Supabase SQL Editor to seed the Super Admin account.
-- IMPORTANT: Change the password variable below before running in production!
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
DECLARE
  super_admin_email TEXT := 'ternongoatserawua@gmail.com';
  super_admin_pass  TEXT := 'ter080808';
  super_admin_name  TEXT := 'Ternongo Atser Awua';
  super_admin_phone TEXT := '08080808080';
  target_user_id    UUID;
BEGIN
  -- 1. Check if user already exists in auth.users
  SELECT id INTO target_user_id FROM auth.users WHERE email = super_admin_email;

  IF target_user_id IS NULL THEN
    target_user_id := gen_random_uuid();
    
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
      target_user_id,
      '00000000-0000-0000-0000-000000000000',
      super_admin_email,
      crypt(super_admin_pass, gen_salt('bf')),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object(
        'full_name', super_admin_name,
        'name', super_admin_name,
        'phone', super_admin_phone,
        'role', 'super_admin',
        'status', 'active'
      ),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      encode(gen_random_bytes(32), 'hex')
    );
  ELSE
    -- User exists, update password and metadata to super_admin
    UPDATE auth.users
    SET 
      encrypted_password = crypt(super_admin_pass, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
        'full_name', super_admin_name,
        'name', super_admin_name,
        'phone', super_admin_phone,
        'role', 'super_admin',
        'status', 'active'
      ),
      updated_at = NOW()
    WHERE id = target_user_id;
  END IF;

  -- 2. Upsert into public.profiles
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
    rating,
    deals_completed,
    created_at,
    updated_at
  ) VALUES (
    target_user_id,
    super_admin_name,
    super_admin_email,
    super_admin_phone,
    'super_admin',
    'active',
    'Benue State',
    'Makurdi',
    TRUE,
    5.0,
    999,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    status = 'active',
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    verified = TRUE,
    updated_at = NOW();

  RAISE NOTICE 'Super Admin initialized successfully: % (ID: %)', super_admin_email, target_user_id;
END $$;
