-- ==============================================================================
-- BENUE MARKET: ADMIN SUBSCRIPTION RECEIPTS & REMAINING DAYS TRACKING
-- Migration: 20241012_admin_subscription_receipts_and_expiration.sql
-- ==============================================================================

-- 1. Ensure public.payment_transactions has all necessary columns
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'card',
  ADD COLUMN IF NOT EXISTS paystack_data JSONB DEFAULT '{}'::jsonb;

-- 2. Indexes for fast transaction lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_vendor_created 
  ON public.payment_transactions(vendor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
  ON public.payment_transactions(status);

-- 3. RLS policy to ensure authenticated admins can view all transactions
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

-- 4. High-Performance RPC for Admins to fetch all subscription receipts with farmer identity & remaining days
CREATE OR REPLACE FUNCTION public.admin_get_subscription_transactions()
RETURNS TABLE (
  id                      UUID,
  reference               TEXT,
  vendor_id               UUID,
  vendor_name             TEXT,
  vendor_email            TEXT,
  vendor_phone            TEXT,
  vendor_location         TEXT,
  vendor_lga              TEXT,
  plan_id                 TEXT,
  amount                  NUMERIC,
  currency                TEXT,
  status                  TEXT,
  channel                 TEXT,
  paid_at                 TIMESTAMPTZ,
  customer_email          TEXT,
  paystack_data           JSONB,
  created_at              TIMESTAMPTZ,
  subscription_started_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  subscription_status     TEXT,
  days_remaining          INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin or super_admin
  IF NOT (
    (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can view all subscription receipts.';
  END IF;

  RETURN QUERY
  SELECT 
    pt.id,
    pt.reference,
    pt.vendor_id,
    COALESCE(p.full_name, 'Benue Farmer')::TEXT AS vendor_name,
    COALESCE(pt.customer_email, p.email, 'farmer@benuemarket.ng')::TEXT AS vendor_email,
    COALESCE(p.phone, '')::TEXT AS vendor_phone,
    COALESCE(p.location, 'Benue State')::TEXT AS vendor_location,
    COALESCE(p.lga, '')::TEXT AS vendor_lga,
    pt.plan_id,
    pt.amount,
    pt.currency,
    pt.status,
    COALESCE(pt.channel, 'card')::TEXT AS channel,
    COALESCE(pt.paid_at, pt.created_at) AS paid_at,
    pt.customer_email,
    pt.paystack_data,
    pt.created_at,
    p.subscription_started_at,
    p.subscription_expires_at,
    COALESCE(p.subscription_status, 'active')::TEXT AS subscription_status,
    GREATEST(0, CEIL(EXTRACT(EPOCH FROM (COALESCE(p.subscription_expires_at, NOW()) - NOW())) / 86400)::INT) AS days_remaining
  FROM public.payment_transactions pt
  LEFT JOIN public.profiles p ON pt.vendor_id = p.id
  ORDER BY pt.created_at DESC;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_get_subscription_transactions() TO authenticated;

-- 5. RPC to fetch single transaction receipt by reference
CREATE OR REPLACE FUNCTION public.admin_get_subscription_receipt(p_reference TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify caller is admin or super_admin or owner
  IF NOT (
    (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.payment_transactions 
      WHERE reference = p_reference AND vendor_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to view this receipt.';
  END IF;

  SELECT jsonb_build_object(
    'id', pt.id,
    'reference', pt.reference,
    'vendor_id', pt.vendor_id,
    'vendor_name', COALESCE(p.full_name, 'Benue Farmer'),
    'vendor_email', COALESCE(pt.customer_email, p.email, 'farmer@benuemarket.ng'),
    'vendor_phone', COALESCE(p.phone, ''),
    'vendor_location', COALESCE(p.location, 'Benue State'),
    'vendor_lga', COALESCE(p.lga, ''),
    'plan_id', pt.plan_id,
    'amount', pt.amount,
    'currency', pt.currency,
    'status', pt.status,
    'channel', COALESCE(pt.channel, 'card'),
    'paid_at', COALESCE(pt.paid_at, pt.created_at),
    'created_at', pt.created_at,
    'subscription_started_at', p.subscription_started_at,
    'subscription_expires_at', p.subscription_expires_at,
    'subscription_status', p.subscription_status,
    'days_remaining', GREATEST(0, CEIL(EXTRACT(EPOCH FROM (COALESCE(p.subscription_expires_at, NOW()) - NOW())) / 86400)::INT),
    'paystack_data', pt.paystack_data
  )
  INTO v_result
  FROM public.payment_transactions pt
  LEFT JOIN public.profiles p ON pt.vendor_id = p.id
  WHERE pt.reference = p_reference
  LIMIT 1;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_subscription_receipt(TEXT) TO authenticated;
