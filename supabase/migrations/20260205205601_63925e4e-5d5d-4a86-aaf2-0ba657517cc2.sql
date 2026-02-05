-- Add tagline column to app_settings
ALTER TABLE public.app_settings 
ADD COLUMN tagline text DEFAULT 'Your spooky-good customer dashboard 👻';