
-- Create addon_types table (same pattern as device_types / service_types)
CREATE TABLE public.addon_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  user_id uuid NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.addon_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own addon_types" ON public.addon_types FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own addon_types" ON public.addon_types FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own addon_types" ON public.addon_types FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own addon_types" ON public.addon_types FOR DELETE USING (auth.uid() = user_id);

-- Add selected_addons JSONB column to customers
ALTER TABLE public.customers ADD COLUMN selected_addons jsonb NOT NULL DEFAULT '[]'::jsonb;
