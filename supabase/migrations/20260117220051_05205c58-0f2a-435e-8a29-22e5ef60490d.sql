-- Create storage bucket for production files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'production-files',
  'production-files',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'video/mp4', 'video/quicktime', 'text/plain', 'application/zip', 'application/x-zip-compressed']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for production-files bucket
-- Team members can view files for tasks they can access
CREATE POLICY "Team members can view production files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'production-files' 
  AND auth.uid() IS NOT NULL
);

-- Team members can upload files
CREATE POLICY "Team members can upload production files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'production-files'
  AND auth.uid() IS NOT NULL
);

-- Team members can update their own files
CREATE POLICY "Team members can update production files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'production-files'
  AND auth.uid() IS NOT NULL
);

-- Team members can delete files
CREATE POLICY "Team members can delete production files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'production-files'
  AND auth.uid() IS NOT NULL
);

-- Add policy for task_files to allow updates (for toggling guest accessibility)
CREATE POLICY "Members can update task_files"
ON public.task_files FOR UPDATE
USING (auth.uid() IS NOT NULL AND is_team_member());