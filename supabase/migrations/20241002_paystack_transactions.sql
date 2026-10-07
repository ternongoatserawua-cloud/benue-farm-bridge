-- ==============================================================================
-- BENUE MARKET: PAYSTACK TRANSACTIONS & SECURE SUBSCRIPTION ACTIVATION
-- Run this in your Supabase SQL Editor (Database -> SQL Editor)
-- ==============================================================================

-- 1. Ensure subscription fields exist on public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan        TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_started_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_expires_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_status      TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_payment_ref TEXT DEFAULT NULL;

-- 2. Create the payment_transactions audit table
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

-- 3. Indexes for rapid lookups and financial reporting
CREATE INDEX IF NOT EXISTS idx_payment_transactions_vendor_id 
  ON public.payment_transactions(vendor_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference 
  ON public.payment_transactions(reference);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at 
  ON public.payment_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status 
  ON public.profiles(subscription_status);

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires_at 
  ON public.profiles(subscription_expires_at);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for payment_transactions
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

-- 6. Atomic Activation Function (SECURITY DEFINER)
-- Atomically writes the verified transaction and updates vendor profile subscription status
CREATE OR REPLACE FUNCTION public.process_paystack_activation(
  p_reference       TEXT,
  p_vendor_id       UUID,
  p_plan_id         TEXT,
  p_amount          NUMERIC,
  p_channel         TEXT DEFAULT 'card',
  p_customer_email  TEXT DEFAULT NULL,
  p_paystack_data   JSONB DEFAULT '{}'::jsonb,
  p_is_renewal      BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now             TIMESTAMPTZ := NOW();
  v_expires_at      TIMESTAMPTZ;
  v_started_at      TIMESTAMPTZ := v_now;
  v_current_expiry  TIMESTAMPTZ;
  v_current_started TIMESTAMPTZ;
  v_record_id       UUID;
BEGIN
  -- Prevent replaying the same payment reference
  IF EXISTS (SELECT 1 FROM public.payment_transactions WHERE reference = p_reference AND status = 'success') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction reference has already been processed.'
    );
  END IF;

  -- Calculate expiration date (30 days)
  IF p_is_renewal THEN
    SELECT subscription_expires_at, subscription_started_at 
    INTO v_current_expiry, v_current_started
    FROM public.profiles 
    WHERE id = p_vendor_id;

    IF v_current_expiry IS NOT NULL AND v_current_expiry > v_now THEN
      v_expires_at := v_current_expiry + INTERVAL '30 days';
      v_started_at := COALESCE(v_current_started, v_now);
    ELSE
      v_expires_at := v_now + INTERVAL '30 days';
    END IF;
  ELSE
    v_expires_at := v_now + INTERVAL '30 days';
  END IF;

  -- 1. Insert into payment_transactions audit table
  INSERT INTO public.payment_transactions (
    reference,
    vendor_id,
    plan_id,
    amount,
    currency,
    status,
    channel,
    paid_at,
    customer_email,
    paystack_data,
    created_at
  ) VALUES (
    p_reference,
    p_vendor_id,
    p_plan_id,
    p_amount,
    'NGN',
    'success',
    COALESCE(p_channel, 'card'),
    v_now,
    p_customer_email,
    p_paystack_data,
    v_now
  )
  RETURNING id INTO v_record_id;

  -- 2. Update profiles table with new subscription tier & timestamps
  UPDATE public.profiles
  SET
    subscription_plan        = p_plan_id,
    subscription_started_at  = v_started_at,
    subscription_expires_at  = v_expires_at,
    subscription_status      = 'active',
    subscription_payment_ref = p_reference,
    updated_at               = v_now
  WHERE id = p_vendor_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_record_id,
    'vendor_id', p_vendor_id,
    'plan_id', p_plan_id,
    'started_at', v_started_at,
    'expires_at', v_expires_at,
    'status', 'active',
    'reference', p_reference
  );
END;
$$;
