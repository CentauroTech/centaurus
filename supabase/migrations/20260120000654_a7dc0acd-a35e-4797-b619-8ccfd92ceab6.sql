-- Phase 2: Add delivery file columns to guest_completed_tasks
ALTER TABLE guest_completed_tasks 
ADD COLUMN IF NOT EXISTS delivery_file_url TEXT,
ADD COLUMN IF NOT EXISTS delivery_file_name TEXT;

-- Phase 4: Add phase and viewer_id to comments for isolation
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS phase TEXT,
ADD COLUMN IF NOT EXISTS viewer_id UUID REFERENCES team_members(id);

-- Phase 6: Add board_name to notifications for context preservation
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS board_name TEXT;

-- Update RLS policy for comments to enforce phase/viewer isolation for guests
DROP POLICY IF EXISTS "Authenticated members can view comments" ON comments;
CREATE POLICY "Authenticated members can view comments" ON comments
  FOR SELECT USING (
    auth.uid() IS NOT NULL 
    AND is_team_member() 
    AND can_view_task(task_id) 
    AND (
      is_centauro_member() 
      OR (
        is_guest_visible = true 
        AND (viewer_id IS NULL OR viewer_id = current_team_member_id())
      )
    )
  );

-- Update notify_on_mention function to store board_name
CREATE OR REPLACE FUNCTION public.notify_on_mention()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_task_id UUID;
  v_task_name TEXT;
  v_triggered_by_id UUID;
  v_triggered_by_name TEXT;
  v_comment_content TEXT;
  v_board_name TEXT;
  v_message TEXT;
  v_notification_id UUID;
BEGIN
  -- Get the task_id, task name, and comment content
  SELECT c.task_id, t.name, c.content INTO v_task_id, v_task_name, v_comment_content
  FROM comments c
  JOIN tasks t ON c.task_id = t.id
  WHERE c.id = NEW.comment_id;
  
  -- Get the board name through task -> task_group -> board
  SELECT b.name INTO v_board_name
  FROM tasks t
  JOIN task_groups tg ON t.group_id = tg.id
  JOIN boards b ON tg.board_id = b.id
  WHERE t.id = v_task_id;
  
  -- Get the person who wrote the comment (triggered by)
  SELECT c.user_id INTO v_triggered_by_id
  FROM comments c
  WHERE c.id = NEW.comment_id;
  
  -- Get triggered by name
  SELECT name INTO v_triggered_by_name
  FROM team_members
  WHERE id = v_triggered_by_id;
  
  -- Skip if user mentioned themselves
  IF NEW.mentioned_user_id = v_triggered_by_id THEN
    RETURN NEW;
  END IF;
  
  -- Build message with comment preview (truncate if too long)
  v_message := '"' || LEFT(v_comment_content, 100) || CASE WHEN LENGTH(v_comment_content) > 100 THEN '...' ELSE '' END || '"';
  IF v_board_name IS NOT NULL THEN
    v_message := v_message || ' in ' || v_board_name;
  END IF;
  
  -- Create notification with board_name stored
  v_notification_id := create_notification(
    NEW.mentioned_user_id,
    'mention',
    v_task_id,
    v_triggered_by_id,
    v_triggered_by_name || ' mentioned you in ' || COALESCE(v_task_name, 'a task'),
    v_message
  );
  
  -- Update the notification with board_name if created
  IF v_notification_id IS NOT NULL THEN
    UPDATE notifications SET board_name = v_board_name WHERE id = v_notification_id;
  END IF;
  
  RETURN NEW;
END;
$function$;