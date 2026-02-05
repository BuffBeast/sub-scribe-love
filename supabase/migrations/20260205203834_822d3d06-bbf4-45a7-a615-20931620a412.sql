-- Add reminders_enabled column to customers table
ALTER TABLE public.customers 
ADD COLUMN reminders_enabled boolean NOT NULL DEFAULT true;