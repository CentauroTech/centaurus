-- Drop and recreate with simpler approach using to_jsonb
DROP FUNCTION IF EXISTS get_hq_board_data(UUID);

CREATE OR REPLACE FUNCTION get_hq_board_data(board_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  workspace_id_val UUID;
BEGIN
  -- Get workspace_id for this HQ board
  SELECT workspace_id INTO workspace_id_val
  FROM boards WHERE id = board_id_param AND is_hq = true;
  
  IF workspace_id_val IS NULL THEN
    RETURN NULL;
  END IF;

  -- Build the complete result using to_jsonb for tasks (avoids 100 argument limit)
  SELECT json_build_object(
    'tasks', (
      SELECT COALESCE(json_agg(
        to_jsonb(t.*) || jsonb_build_object(
          'currentPhase', CASE 
            WHEN position('-' in b.name) > 0 
            THEN substring(b.name from position('-' in b.name) + 1)
            ELSE b.name 
          END,
          'comment_count', COALESCE((SELECT COUNT(*)::int FROM comments c WHERE c.task_id = t.id), 0)
        )
        ORDER BY t.sort_order
      ), '[]'::json)
      FROM tasks t
      JOIN task_groups tg ON t.group_id = tg.id
      JOIN boards b ON tg.board_id = b.id
      WHERE b.workspace_id = workspace_id_val AND b.is_hq = false
    ),
    'team_members', (
      SELECT COALESCE(json_agg(to_jsonb(tm.*)), '[]'::json)
      FROM team_members tm
    ),
    'task_people', (
      SELECT COALESCE(json_agg(jsonb_build_object(
        'task_id', tp.task_id,
        'team_member_id', tp.team_member_id
      )), '[]'::json)
      FROM task_people tp
      WHERE tp.task_id IN (
        SELECT t.id FROM tasks t
        JOIN task_groups tg ON t.group_id = tg.id
        JOIN boards b ON tg.board_id = b.id
        WHERE b.workspace_id = workspace_id_val AND b.is_hq = false
      )
    ),
    'task_viewers', (
      SELECT COALESCE(json_agg(jsonb_build_object(
        'task_id', tv.task_id,
        'team_member_id', tv.team_member_id
      )), '[]'::json)
      FROM task_viewers tv
      WHERE tv.task_id IN (
        SELECT t.id FROM tasks t
        JOIN task_groups tg ON t.group_id = tg.id
        JOIN boards b ON tg.board_id = b.id
        WHERE b.workspace_id = workspace_id_val AND b.is_hq = false
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_hq_board_data(UUID) TO authenticated;