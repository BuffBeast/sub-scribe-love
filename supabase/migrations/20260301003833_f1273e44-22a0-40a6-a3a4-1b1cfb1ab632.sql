
-- Add separate trial columns for LIVE and VOD
ALTER TABLE public.customers ADD COLUMN has_live_trial boolean NOT NULL DEFAULT false;
ALTER TABLE public.customers ADD COLUMN has_vod_trial boolean NOT NULL DEFAULT false;

-- Migrate existing has_trial data to both columns
UPDATE public.customers SET has_live_trial = has_trial, has_vod_trial = has_trial;
