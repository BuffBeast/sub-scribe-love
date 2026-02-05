-- Create custom_fields table to store user-defined fields
CREATE TABLE public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create customers table with core fields + JSONB for custom data
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  subscription_status TEXT DEFAULT 'active',
  subscription_plan TEXT,
  subscription_start_date DATE,
  subscription_end_date DATE,
  last_contact_date DATE,
  total_spent NUMERIC DEFAULT 0,
  custom_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create column_visibility table for toggling built-in columns
CREATE TABLE public.column_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_name TEXT NOT NULL UNIQUE,
  is_visible BOOLEAN NOT NULL DEFAULT true
);

-- Insert default column visibility settings
INSERT INTO public.column_visibility (column_name, is_visible) VALUES
  ('name', true),
  ('email', true),
  ('phone', true),
  ('company', true),
  ('subscription_status', true),
  ('subscription_plan', true),
  ('last_contact_date', true),
  ('total_spent', true);

-- Enable RLS
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.column_visibility ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required for this app)
CREATE POLICY "Anyone can view custom_fields" ON public.custom_fields FOR SELECT USING (true);
CREATE POLICY "Anyone can insert custom_fields" ON public.custom_fields FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update custom_fields" ON public.custom_fields FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete custom_fields" ON public.custom_fields FOR DELETE USING (true);

CREATE POLICY "Anyone can view customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update customers" ON public.customers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete customers" ON public.customers FOR DELETE USING (true);

CREATE POLICY "Anyone can view column_visibility" ON public.column_visibility FOR SELECT USING (true);
CREATE POLICY "Anyone can update column_visibility" ON public.column_visibility FOR UPDATE USING (true);