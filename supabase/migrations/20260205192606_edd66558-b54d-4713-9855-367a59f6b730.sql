-- Update default app_name value
ALTER TABLE public.app_settings ALTER COLUMN app_name SET DEFAULT 'Let''s Stream Customer Tracker';

-- Update any existing rows that still have the old default
UPDATE public.app_settings SET app_name = 'Let''s Stream Customer Tracker' WHERE app_name = 'GhostBuff';