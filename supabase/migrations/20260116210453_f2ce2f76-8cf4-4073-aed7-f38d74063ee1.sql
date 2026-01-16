-- Create task_viewers table to track which guests can see private tasks
CREATE TABLE public.task_viewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, team_member_id)
);

-- Enable RLS
ALTER TABLE public.task_viewers ENABLE ROW LEVEL SECURITY;

-- Authenticated members can read task_viewers
CREATE POLICY "Authenticated members can read task_viewers"
  ON public.task_viewers
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_team_member());

-- Members can insert task_viewers
CREATE POLICY "Members can insert task_viewers"
  ON public.task_viewers
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND is_team_member());

-- Members can delete task_viewers
CREATE POLICY "Members can delete task_viewers"
  ON public.task_viewers
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND is_team_member());

-- Create index for performance
CREATE INDEX idx_task_viewers_task_id ON public.task_viewers(task_id);
CREATE INDEX idx_task_viewers_team_member_id ON public.task_viewers(team_member_id);

-- Create a function to check if user is a guest (no @centauro.com email)
CREATE OR REPLACE FUNCTION public.is_guest()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE email = auth.email()
    AND (email NOT LIKE '%@centauro.com' OR email IS NULL)
  );
$$;

-- Create a function to check if user can view a specific task
CREATE OR REPLACE FUNCTION public.can_view_task(task_id_param UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- Non-private tasks are visible to all team members
    NOT (SELECT is_private FROM public.tasks WHERE id = task_id_param)
    OR
    -- Members with @centauro.com email can see all tasks
    (auth.email() LIKE '%@centauro.com')
    OR
    -- Guests can see private tasks if they are viewers
    EXISTS (
      SELECT 1 FROM public.task_viewers tv
      JOIN public.team_members tm ON tv.team_member_id = tm.id
      WHERE tv.task_id = task_id_param
      AND tm.email = auth.email()
    )
    OR
    -- Guests can see private tasks if they are assigned (in task_people)
    EXISTS (
      SELECT 1 FROM public.task_people tp
      JOIN public.team_members tm ON tp.team_member_id = tm.id
      WHERE tp.task_id = task_id_param
      AND tm.email = auth.email()
    );
$$;