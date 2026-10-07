-- ============================================================
-- Benue Market: Subscription System Migration
-- Run this in your Supabase SQL Editor (Database → SQL Editor)
-- ============================================================

-- Add subscription columns to the profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_plan        TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_started_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_expires_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_status      TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_payment_ref TEXT DEFAULT NULL;

-- Index for fast lookup (e.g., admin queries)
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status
  ON profiles (subscription_status);

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires_at
  ON profiles (subscription_expires_at);

-- Row Level Security: vendors can read/update their own subscription data
-- (Supabase service role key bypasses RLS for admin operations)
CREATE POLICY IF NOT EXISTS "Vendors can read own subscription"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Vendors can update own subscription"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
