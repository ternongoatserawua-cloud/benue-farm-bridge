-- ==============================================================================
-- BENUE AGRO-MARKETPLACE: RECYCLE BIN MIGRATION
-- Adds support for 'recycled' produce status and 'recycled_at' timestamp
-- ==============================================================================

-- 1. Add recycled_at column if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'recycled_at'
  ) THEN
    ALTER TABLE public.products ADD COLUMN recycled_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Update status constraint to permit 'recycled' status
DO $$
BEGIN
  -- Drop existing check constraint on status if present
  ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;
  
  -- Re-add check constraint including 'recycled'
  ALTER TABLE public.products 
    ADD CONSTRAINT products_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'recycled'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint update handled or not needed: %', SQLERRM;
END $$;

-- 3. Create index on recycled_at and status for fast admin recycle bin queries
CREATE INDEX IF NOT EXISTS idx_products_recycled_at ON public.products(recycled_at);
CREATE INDEX IF NOT EXISTS idx_products_status_recycled ON public.products(status);
