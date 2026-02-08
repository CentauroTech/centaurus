
-- Add edited_at column to comments for tracking edits
ALTER TABLE public.comments ADD COLUMN edited_at timestamp with time zone DEFAULT NULL;

-- Create comment_likes table
CREATE TABLE public.comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Team members can view likes"
  ON public.comment_likes FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_team_member());

CREATE POLICY "Team members can insert own likes"
  ON public.comment_likes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND is_team_member() AND user_id = current_team_member_id());

CREATE POLICY "Team members can delete own likes"
  ON public.comment_likes FOR DELETE
  USING (auth.uid() IS NOT NULL AND user_id = current_team_member_id());

-- Create comment_attachments table
CREATE TABLE public.comment_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'other',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.comment_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view attachments"
  ON public.comment_attachments FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_team_member());

CREATE POLICY "Team members can insert attachments"
  ON public.comment_attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND is_team_member());

CREATE POLICY "Team members can delete attachments"
  ON public.comment_attachments FOR DELETE
  USING (auth.uid() IS NOT NULL AND is_team_member());

-- Enable realtime for likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
