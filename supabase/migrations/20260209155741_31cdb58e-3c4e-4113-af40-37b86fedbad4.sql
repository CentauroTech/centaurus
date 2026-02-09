
-- Fix comments SELECT policy: use is_internal_member() instead of is_centauro_member()
DROP POLICY IF EXISTS "Authenticated members can view comments" ON public.comments;
CREATE POLICY "Authenticated members can view comments"
ON public.comments FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_team_member() 
  AND can_view_task(task_id) 
  AND (
    is_internal_member() 
    OR (is_guest_visible = true AND viewer_id = current_team_member_id())
  )
);

-- Also fix task_files SELECT policy which has the same issue
DROP POLICY IF EXISTS "Authenticated members can view task_files" ON public.task_files;
CREATE POLICY "Authenticated members can view task_files"
ON public.task_files FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_team_member() 
  AND can_view_task(task_id) 
  AND (
    is_internal_member() 
    OR is_guest_accessible = true
  )
);

-- Also fix can_view_task function to use is_internal_member() instead of email domain check
CREATE OR REPLACE FUNCTION public.can_view_task(task_id_param uuid)
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
    -- Internal members (god, admin, team_member, etc.) can see all tasks
    is_internal_member()
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
