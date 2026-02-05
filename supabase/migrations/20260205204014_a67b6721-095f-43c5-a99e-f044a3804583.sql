-- Add has_trial column to customers table
ALTER TABLE public.customers 
ADD COLUMN has_trial boolean NOT NULL DEFAULT false;