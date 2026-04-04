-- Remove the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;

-- Remove the owner-based SELECT policy (will replace with path-scoped)
DROP POLICY IF EXISTS "Users can read their own logos" ON storage.objects;

-- Remove the weak INSERT policy
DROP POLICY IF EXISTS "Users can upload their own logos" ON storage.objects;

-- Remove old UPDATE/DELETE policies to replace with path-scoped versions
DROP POLICY IF EXISTS "Users can update their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own logos" ON storage.objects;

-- Create path-scoped SELECT policy
CREATE POLICY "Users can read their own logos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create path-scoped INSERT policy
CREATE POLICY "Users can upload their own logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create path-scoped UPDATE policy
CREATE POLICY "Users can update their own logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create path-scoped DELETE policy
CREATE POLICY "Users can delete their own logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);