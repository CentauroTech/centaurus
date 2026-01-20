-- Allow authenticated users to view the production-files bucket
CREATE POLICY "Authenticated users can view production-files bucket"
ON storage.buckets
FOR SELECT
USING (id = 'production-files' AND auth.uid() IS NOT NULL);