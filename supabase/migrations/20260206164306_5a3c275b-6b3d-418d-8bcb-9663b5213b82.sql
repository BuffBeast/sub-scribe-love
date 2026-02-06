-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can read logos" ON storage.objects;

-- Create restrictive policy: users can only read their own logos
CREATE POLICY "Users can read their own logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos' AND auth.uid() = owner);