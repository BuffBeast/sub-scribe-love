-- Add theme color to app_settings
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS theme_color text DEFAULT 'purple';