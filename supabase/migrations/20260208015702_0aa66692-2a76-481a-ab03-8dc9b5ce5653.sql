-- Add options column to custom_fields for dropdown/select field types
ALTER TABLE public.custom_fields
ADD COLUMN options jsonb DEFAULT NULL;