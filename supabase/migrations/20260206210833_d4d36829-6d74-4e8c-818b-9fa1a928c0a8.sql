-- Add device column to customers table
ALTER TABLE public.customers ADD COLUMN device text NULL;

-- Create device_types table for managing available device options
CREATE TABLE public.device_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  user_id uuid NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_types ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own device_types" 
ON public.device_types FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device_types" 
ON public.device_types FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device_types" 
ON public.device_types FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device_types" 
ON public.device_types FOR DELETE 
USING (auth.uid() = user_id);