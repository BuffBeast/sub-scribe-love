-- Create service_types table for customizable services
CREATE TABLE public.service_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own service_types" 
ON public.service_types 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own service_types" 
ON public.service_types 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own service_types" 
ON public.service_types 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own service_types" 
ON public.service_types 
FOR DELETE 
USING (auth.uid() = user_id);