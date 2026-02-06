-- Add service column to customers table
ALTER TABLE public.customers 
ADD COLUMN service text NULL;