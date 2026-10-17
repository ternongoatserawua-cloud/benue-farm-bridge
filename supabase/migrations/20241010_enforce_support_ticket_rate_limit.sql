-- ==============================================================================
-- BENUE AGRICULTURAL MARKETPLACE — TICKET RATE LIMIT TRIGGER
-- ==============================================================================
-- Rate Limiting Cooldown Rules for Support Tickets:
-- 1. After submitting 1st ticket -> must wait 30 minutes before 2nd ticket
-- 2. After submitting 2nd ticket -> must wait 24 hours before 3rd ticket
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
