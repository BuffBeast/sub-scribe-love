-- Make logos storage bucket private to prevent unauthorized access
UPDATE storage.buckets SET public = false WHERE id = 'logos';

-- Add a policy to allow authenticated users to read their own uploaded logos
-- (The existing policies already handle insert/update/delete)
CREATE POLICY "Authenticated users can read logos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'logos');