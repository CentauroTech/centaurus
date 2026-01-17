-- Update notify_on_mention function to include comment content preview
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
  
  -- Create notification
  PERFORM create_notification(
    NEW.mentioned_user_id,
    'mention',
    v_task_id,
    v_triggered_by_id,
    v_triggered_by_name || ' mentioned you in ' || COALESCE(v_task_name, 'a task'),
    v_message
  );
  
  RETURN NEW;
END;
$function$;