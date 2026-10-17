-- ==============================================================================
-- BENUE AGRICULTURAL MARKETPLACE — SUPPORT TICKETS TABLE & RLS POLICIES
-- ==============================================================================
-- Enables forwarding of support tickets from buyers and farmers directly to the
-- Administrator Control Center and Supabase database.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  user_role TEXT DEFAULT 'buyer',
  topic TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'normal',
  reference_id TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_notes TEXT DEFAULT '',
  resolved_at TIMESTAMPTZ DEFAULT NULL,
  resolved_by TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_id ON public.support_tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);

-- Enable Row Level Security (RLS)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 1. Anyone (authenticated or anonymous) can submit a support ticket
DROP POLICY IF EXISTS "Anyone can submit support tickets" ON public.support_tickets;
CREATE POLICY "Anyone can submit support tickets"
  ON public.support_tickets
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. Admins and Super Admins can view all tickets
DROP POLICY IF EXISTS "Admins can view all support tickets" ON public.support_tickets;
CREATE POLICY "Admins can view all support tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- 3. Admins can update tickets (status, admin_notes, resolved_at)
DROP POLICY IF EXISTS "Admins can update support tickets" ON public.support_tickets;
CREATE POLICY "Admins can update support tickets"
  ON public.support_tickets
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 4. Admins can delete support tickets
DROP POLICY IF EXISTS "Admins can delete support tickets" ON public.support_tickets;
CREATE POLICY "Admins can delete support tickets"
  ON public.support_tickets
  FOR DELETE
  TO authenticated, anon
  USING (true);

-- Enable Realtime publication for support_tickets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'support_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- ==============================================================================
-- 5. Rate Limiting Cooldown Trigger for Support Tickets
-- ==============================================================================
-- Rules:
-- 1. After submitting 1st ticket -> must wait 30 minutes before 2nd ticket
-- 2. After submitting 2nd ticket -> must wait 24 hours before next ticket
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_support_ticket_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_ticket_time TIMESTAMPTZ;
  v_tickets_in_24h INT;
  v_phone_cleaned TEXT;
  v_email_cleaned TEXT;
BEGIN
  v_email_cleaned := LOWER(TRIM(COALESCE(NEW.email, '')));
  v_phone_cleaned := REGEXP_REPLACE(COALESCE(NEW.phone, ''), '\D', '', 'g');

  -- If neither email nor phone is provided, bypass rate check
  IF v_email_cleaned = '' AND v_phone_cleaned = '' THEN
    RETURN NEW;
  END IF;

  -- Count recent tickets by this user in the past 24 hours and get the most recent one
  SELECT 
    COUNT(*),
    MAX(created_at)
  INTO 
    v_tickets_in_24h,
    v_last_ticket_time
  FROM public.support_tickets
  WHERE 
    created_at >= NOW() - INTERVAL '24 hours'
    AND (
      (v_email_cleaned <> '' AND LOWER(TRIM(COALESCE(email, ''))) = v_email_cleaned)
      OR
      (v_phone_cleaned <> '' AND REGEXP_REPLACE(COALESCE(phone, ''), '\D', '', 'g') = v_phone_cleaned)
    );

  -- 1st Cooldown rule: If user submitted 1 ticket in past 24 hours, must wait 30 minutes
  IF v_tickets_in_24h = 1 THEN
    IF NOW() < (v_last_ticket_time + INTERVAL '30 minutes') THEN
      RAISE EXCEPTION 'Ticket cooldown active: You can submit another support ticket after 30 minutes.';
    END IF;
  END IF;

  -- 2nd Cooldown rule: If user submitted 2 or more tickets in past 24 hours, must wait 24 hours
  IF v_tickets_in_24h >= 2 THEN
    IF NOW() < (v_last_ticket_time + INTERVAL '24 hours') THEN
      RAISE EXCEPTION 'Ticket quota reached: You have submitted 2 support tickets. You can submit another ticket after 24 hours.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_support_ticket_rate_limit ON public.support_tickets;
CREATE TRIGGER trg_enforce_support_ticket_rate_limit
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.check_support_ticket_rate_limit();

