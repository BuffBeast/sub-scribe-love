-- Create the updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create app_settings table for branding customization
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_name TEXT NOT NULL DEFAULT 'GhostBuff',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Anyone can view app settings"
ON public.app_settings
FOR SELECT
USING (true);

-- Allow public update
CREATE POLICY "Anyone can update app settings"
ON public.app_settings
FOR UPDATE
USING (true);

-- Insert default row
INSERT INTO public.app_settings (app_name, logo_url) VALUES ('GhostBuff', NULL);

-- Create logos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- Storage policies for logos bucket
CREATE POLICY "Anyone can view logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Anyone can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Anyone can update logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'logos');

CREATE POLICY "Anyone can delete logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'logos');

-- Trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();