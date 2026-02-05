-- Drop existing permissive policies on logos bucket
DROP POLICY IF EXISTS "Anyone can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete logos" ON storage.objects;

-- Create user-scoped policies for authenticated users only
CREATE POLICY "Users can upload their own logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'logos' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'logos' AND auth.uid() = owner);