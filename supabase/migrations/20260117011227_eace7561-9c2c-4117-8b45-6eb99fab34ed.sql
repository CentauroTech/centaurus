-- Add DELETE policy for comment_mentions table
-- Allow team members to delete comment mentions for comments they own
CREATE POLICY "Comment authors can delete mentions"
ON public.comment_mentions
FOR DELETE
USING (
  (auth.uid() IS NOT NULL) 
  AND is_team_member()
  AND EXISTS (
    SELECT 1 FROM public.comments c
    WHERE c.id = comment_mentions.comment_id
    AND c.user_id = current_team_member_id()
  )
);