
-- Convert device column from text to jsonb array
-- First, convert existing text values to jsonb arrays
ALTER TABLE public.customers 
  ALTER COLUMN device TYPE jsonb 
  USING CASE 
    WHEN device IS NULL THEN '[]'::jsonb 
    WHEN device = '' THEN '[]'::jsonb 
    ELSE jsonb_build_array(device) 
  END;

-- Set default to empty array
ALTER TABLE public.customers 
  ALTER COLUMN device SET DEFAULT '[]'::jsonb;
