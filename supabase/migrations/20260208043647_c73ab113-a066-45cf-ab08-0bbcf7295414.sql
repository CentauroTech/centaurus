
-- Drop existing SELECT policy on comments
DROP POLICY IF EXISTS "Authenticated members can view comments" ON public.comments;

-- Recreate with tighter guest isolation: guests can ONLY see comments with their own viewer_id
CREATE POLICY "Authenticated members can view comments"
ON public.comments
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) 
  AND is_team_member() 
  AND can_view_task(task_id) 
  AND (
    is_centauro_member() 
    OR (
      (is_guest_visible = true) 
      AND (viewer_id = current_team_member_id())
    )
  )
);
