
-- Allow internal members to view ALL guest_completed_tasks (not just their own)
CREATE POLICY "Internal members can view all completed tasks"
ON public.guest_completed_tasks
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) AND is_internal_member()
);
