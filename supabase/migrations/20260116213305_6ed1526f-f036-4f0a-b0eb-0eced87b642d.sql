-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Authenticated members can read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated members can read comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated members can read activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Authenticated members can read task_files" ON public.task_files;
DROP POLICY IF EXISTS "Authenticated members can read task_people" ON public.task_people;
DROP POLICY IF EXISTS "Authenticated members can read task_viewers" ON public.task_viewers;

-- Create new SELECT policy for tasks that enforces can_view_task
CREATE POLICY "Authenticated members can view tasks"
ON public.tasks
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) 
  AND is_team_member() 
  AND can_view_task(id)
);

-- Create new SELECT policy for comments that checks task visibility
CREATE POLICY "Authenticated members can view comments"
ON public.comments
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) 
  AND is_team_member() 
  AND can_view_task(task_id)
);

-- Create new SELECT policy for activity_log that checks task visibility
CREATE POLICY "Authenticated members can view activity_log"
ON public.activity_log
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) 
  AND is_team_member() 
  AND can_view_task(task_id)
);

-- Create new SELECT policy for task_files that checks task visibility
CREATE POLICY "Authenticated members can view task_files"
ON public.task_files
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) 
  AND is_team_member() 
  AND can_view_task(task_id)
);

-- Create new SELECT policy for task_people that checks task visibility
CREATE POLICY "Authenticated members can view task_people"
ON public.task_people
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) 
  AND is_team_member() 
  AND can_view_task(task_id)
);

-- Create new SELECT policy for task_viewers that checks task visibility
CREATE POLICY "Authenticated members can view task_viewers"
ON public.task_viewers
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) 
  AND is_team_member() 
  AND can_view_task(task_id)
);