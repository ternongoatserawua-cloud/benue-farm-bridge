-- ==============================================================================
-- BENUE MARKET — RPC FUNCTION: Set Product Availability
-- ==============================================================================
-- Allows vendors and admins to toggle product availability (in stock / sold out)
-- reliably, even across session refresh boundaries.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.set_product_availability(
  p_product_id UUID,
  p_available BOOLEAN,
  p_seller_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_prod RECORD;
  v_updated_row RECORD;
BEGIN
  -- 1. Identify caller if authenticated
  v_caller_id := auth.uid();

  -- 2. Fetch target product
  SELECT id, seller_id, available INTO v_prod
  FROM public.products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  -- 3. Authorization check:
  -- Allowed if:
  -- - Caller is super_admin or admin
  -- - Caller is authenticated and matches seller_id
  -- - p_seller_id is provided and matches seller_id (for client session persistence)
  IF (v_caller_id IS NOT NULL AND public.is_admin())
     OR (v_caller_id IS NOT NULL AND v_caller_id = v_prod.seller_id)
     OR (p_seller_id IS NOT NULL AND p_seller_id = v_prod.seller_id)
  THEN
    UPDATE public.products
    SET available = p_available,
        updated_at = NOW()
    WHERE id = p_product_id
    RETURNING id, available, updated_at, seller_id INTO v_updated_row;

    RETURN jsonb_build_object(
      'success', true,
      'id', v_updated_row.id,
      'available', v_updated_row.available,
      'updated_at', v_updated_row.updated_at
    );
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to modify this product stock.');
  END IF;
END;
$$;

ALTER FUNCTION public.set_product_availability(UUID, BOOLEAN, UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.set_product_availability(UUID, BOOLEAN, UUID) TO authenticated, service_role, anon;
