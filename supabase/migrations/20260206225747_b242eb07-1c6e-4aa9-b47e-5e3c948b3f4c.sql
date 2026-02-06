-- Add reminder_days column to app_settings table
ALTER TABLE public.app_settings 
ADD COLUMN reminder_days integer NOT NULL DEFAULT 30;