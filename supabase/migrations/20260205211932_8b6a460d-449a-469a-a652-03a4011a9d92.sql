-- Add reply_to_email column to app_settings
ALTER TABLE public.app_settings
ADD COLUMN reply_to_email text;