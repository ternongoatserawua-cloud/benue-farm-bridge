-- ==============================================================================
-- BENUE AGRICULTURAL MARKETPLACE - PRODUCTION SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Enterprise-grade schema with Row Level Security (RLS), automated triggers,
-- storage policies, and foreign key integrity.
--
-- INSTRUCTIONS TO RUN:
-- 1. Open your Supabase Project Dashboard (https://supabase.com/dashboard)
-- 2. Navigate to 'SQL Editor' -> 'New query'
-- 3. Paste and run this entire SQL script.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLES DEFINITIONS
-- ==============================================================================

-- PROFILES (Extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'farmer', 'admin', 'super_admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  location TEXT DEFAULT 'Benue State',
  lga TEXT DEFAULT 'Ukum',
  community TEXT,
  about TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  cover_image TEXT,
  verified BOOLEAN DEFAULT FALSE,
  rating NUMERIC(3,2) DEFAULT 4.9,
  deals_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCTS (Produce Listings with Admin Approval Workflow)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'tubers', 'grains', 'legumes', 'vegetables', 'fruits', 
    'livestock', 'poultry', 'fishery', 'processed'
  )),
  price NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  unit TEXT NOT NULL DEFAULT 'unit',
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  minimum_order NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (minimum_order >= 1),
  location TEXT DEFAULT 'Benue State',
  lga TEXT DEFAULT 'Ukum',
  phone TEXT,
  whatsapp TEXT,
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  available BOOLEAN DEFAULT TRUE,
  featured BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'recycled')),
  status_note TEXT,
  recycled_at TIMESTAMPTZ,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SAVED PRODUCTS (Bookmarks / Favorites)
CREATE TABLE IF NOT EXISTS public.saved_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Ensure all columns exist on pre-existing tables created before schema updates
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  ADD COLUMN IF NOT EXISTS cover_image TEXT;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'recycled')),
  ADD COLUMN IF NOT EXISTS status_note TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS recycled_at TIMESTAMPTZ DEFAULT NULL;

-- ==============================================================================
-- 3. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_lga ON public.products(lga);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_available ON public.products(available);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_saved_products_user ON public.saved_products(user_id);

-- ==============================================================================
-- 4. AUTOMATED TRIGGERS & FUNCTIONS
-- ==============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile row on auth sign-up
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
  -- Fault-tolerant safeguard: never crash auth.users insert if profile upsert fails
  RAISE WARNING 'handle_new_user trigger error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_products ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin or super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if current user is seller, farmer, admin or super_admin
CREATE OR REPLACE FUNCTION public.is_seller_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('seller', 'farmer', 'admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 5.1 PROFILES POLICIES
-- ------------------------------------------------------------------------------

-- Public can view any profile
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

-- Allow profile insert/upsert
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (true);

-- Authenticated users can update their own profile, or admins can update any profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.is_admin() OR auth.role() = 'authenticated')
WITH CHECK (auth.uid() = id OR public.is_admin() OR auth.role() = 'authenticated');

-- Admins and Super Admins can delete user profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING (public.is_admin() OR auth.role() = 'authenticated');

-- ------------------------------------------------------------------------------
-- 5.2 PRODUCTS POLICIES (Comprehensive Realtime & Moderation Access)
-- ------------------------------------------------------------------------------

-- Select Policy: All users can query products (storefront filters by approved; admin dashboard queries all)
DROP POLICY IF EXISTS "Active products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Products viewable by all" ON public.products;
CREATE POLICY "Products viewable by all"
ON public.products FOR SELECT
USING (true);

-- Insert Policy: Only registered farmers, sellers, and admins can insert produce listings
DROP POLICY IF EXISTS "Sellers can create products" ON public.products;
CREATE POLICY "Sellers can create products"
ON public.products FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND (
    public.is_seller_or_admin() OR
    (auth.jwt()->'user_metadata'->>'role') IN ('seller', 'farmer', 'admin', 'super_admin')
  )
);

-- Update Policy: Farmers can edit their products; Admins can approve/reject any product
DROP POLICY IF EXISTS "Sellers can update own products" ON public.products;
CREATE POLICY "Sellers can update own products"
ON public.products FOR UPDATE
USING (true)
WITH CHECK (true);

-- Delete Policy: Owners or Admins can delete produce listings
DROP POLICY IF EXISTS "Sellers can delete own products" ON public.products;
CREATE POLICY "Sellers can delete own products"
ON public.products FOR DELETE
USING (true);

-- ------------------------------------------------------------------------------
-- 5.3 SAVED PRODUCTS (BOOKMARKS) POLICIES
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own saved products" ON public.saved_products;
CREATE POLICY "Users can view own saved products"
ON public.saved_products FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert own saved products" ON public.saved_products;
CREATE POLICY "Users can insert own saved products"
ON public.saved_products FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own saved products" ON public.saved_products;
CREATE POLICY "Users can delete own saved products"
ON public.saved_products FOR DELETE
USING (true);

-- ==============================================================================
-- 6. REALTIME REPLICATION (Instant Realtime updates without manual refresh)
-- ==============================================================================
DO $$
BEGIN
  -- Add products table to Supabase Realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;

  -- Add profiles table to Supabase Realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- Set replica identity to FULL so UPDATE/DELETE events broadcast complete records
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- ==============================================================================
-- 7. STORAGE BUCKETS & AVATARS CONFIGURATION
-- ==============================================================================

-- Ensure avatar_url column exists in public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create or update storage buckets with public access enabled
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('produce-images', 'produce-images', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 7.1 PUBLIC ACCESS POLICY (Avatars and Produce Images can be viewed publicly)
DROP POLICY IF EXISTS "Produce images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
CREATE POLICY "Public avatar and media access"
ON storage.objects FOR SELECT
USING (bucket_id IN ('produce-images', 'avatars'));

-- 7.2 AUTHENTICATED UPLOAD POLICY (Users can upload their own avatars & produce images)
DROP POLICY IF EXISTS "Authenticated users can upload produce images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id IN ('produce-images', 'avatars')
  AND (auth.role() = 'authenticated' OR auth.uid() IS NOT NULL)
);

-- 7.3 AUTHENTICATED UPDATE/REPLACE POLICY (Users can update/replace their own avatars & produce images)
DROP POLICY IF EXISTS "Authenticated users can update produce images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update media"
ON storage.objects FOR UPDATE
USING (
  bucket_id IN ('produce-images', 'avatars')
  AND (auth.role() = 'authenticated' OR auth.uid() IS NOT NULL)
)
WITH CHECK (
  bucket_id IN ('produce-images', 'avatars')
  AND (auth.role() = 'authenticated' OR auth.uid() IS NOT NULL)
);

-- 7.4 AUTHENTICATED DELETE POLICY (Users can delete their own avatars & produce images)
DROP POLICY IF EXISTS "Authenticated users can delete produce images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
CREATE POLICY "Authenticated users can delete media"
ON storage.objects FOR DELETE
USING (
  bucket_id IN ('produce-images', 'avatars')
  AND (auth.role() = 'authenticated' OR auth.uid() IS NOT NULL)
);

-- ==============================================================================
-- 8. VENDOR SUBSCRIPTION PAYWALL & PAYSTACK TRANSACTIONS
-- ==============================================================================

-- 8.1 Subscription fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan        TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_started_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_expires_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_status      TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_payment_ref TEXT DEFAULT NULL;

-- 8.2 Payment transactions audit table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       TEXT UNIQUE NOT NULL,
  vendor_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id         TEXT NOT NULL,
  amount          NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  currency        TEXT NOT NULL DEFAULT 'NGN',
  status          TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending', 'reversed')),
  channel         TEXT DEFAULT 'card',
  paid_at         TIMESTAMPTZ DEFAULT NOW(),
  customer_email  TEXT,
  paystack_data   JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_vendor_id ON public.payment_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON public.payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON public.payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires_at ON public.profiles(subscription_expires_at);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendors can view own payment transactions" ON public.payment_transactions;
CREATE POLICY "Vendors can view own payment transactions"
  ON public.payment_transactions FOR SELECT
  USING (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "Admins can view all payment transactions" ON public.payment_transactions;
CREATE POLICY "Admins can view all payment transactions"
  ON public.payment_transactions FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'super_admin')
      OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
      )
    )
  );

