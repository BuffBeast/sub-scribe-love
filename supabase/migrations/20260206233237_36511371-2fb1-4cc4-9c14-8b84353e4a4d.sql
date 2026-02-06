-- First, delete any orphaned records with NULL user_id
DELETE FROM public.customers WHERE user_id IS NULL;
DELETE FROM public.app_settings WHERE user_id IS NULL;
DELETE FROM public.custom_fields WHERE user_id IS NULL;
DELETE FROM public.column_visibility WHERE user_id IS NULL;
DELETE FROM public.device_types WHERE user_id IS NULL;

-- Add NOT NULL constraints to all user_id columns
ALTER TABLE public.customers ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.app_settings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.custom_fields ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.column_visibility ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.device_types ALTER COLUMN user_id SET NOT NULL;