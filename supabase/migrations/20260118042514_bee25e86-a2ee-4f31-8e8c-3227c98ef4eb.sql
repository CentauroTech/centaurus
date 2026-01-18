-- Create optimized function for HQ board data
-- This replaces 6+ queries with a single optimized query

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

  -- Build the complete result in one query
  SELECT json_build_object(
    'tasks', (
      SELECT json_agg(task_data ORDER BY task_data->>'sort_order')
      FROM (
        SELECT json_build_object(
          'id', t.id,
          'name', t.name,
          'status', t.status,
          'is_private', t.is_private,
          'branch', t.branch,
          'group_id', t.group_id,
          'sort_order', t.sort_order,
          'work_order_number', t.work_order_number,
          'client_name', t.client_name,
          'project_manager_id', t.project_manager_id,
          'date_assigned', t.date_assigned,
          'servicios', t.servicios,
          'formato', t.formato,
          'genre', t.genre,
          'cantidad_episodios', t.cantidad_episodios,
          'locked_runtime', t.locked_runtime,
          'final_runtime', t.final_runtime,
          'fase', t.fase,
          'last_updated', t.last_updated,
          'started_at', t.started_at,
          'completed_at', t.completed_at,
          'created_at', t.created_at,
          'currentPhase', CASE 
            WHEN position('-' in b.name) > 0 
            THEN substring(b.name from position('-' in b.name) + 1)
            ELSE b.name 
          END,
          'comment_count', COALESCE(cc.cnt, 0),
          'director_id', t.director_id,
          'tecnico_id', t.tecnico_id,
          'qc_1_id', t.qc_1_id,
          'qc_retakes_id', t.qc_retakes_id,
          'mixer_bogota_id', t.mixer_bogota_id,
          'mixer_miami_id', t.mixer_miami_id,
          'qc_mix_id', t.qc_mix_id,
          'traductor_id', t.traductor_id,
          'adaptador_id', t.adaptador_id,
          'entrega_miami_start', t.entrega_miami_start,
          'entrega_miami_end', t.entrega_miami_end,
          'entrega_cliente', t.entrega_cliente,
          'entrega_sesiones', t.entrega_sesiones,
          'entrega_mix_retakes', t.entrega_mix_retakes,
          'prueba_de_voz', t.prueba_de_voz,
          'aor_needed', t.aor_needed,
          'aor_complete', t.aor_complete,
          'studio', t.studio,
          'hq', t.hq,
          'guest_due_date', t.guest_due_date,
          'phase_due_date', t.phase_due_date,
          'date_delivered', t.date_delivered,
          'delivery_comment', t.delivery_comment,
          'lenguaje_original', t.lenguaje_original,
          'titulo_aprobado_espanol', t.titulo_aprobado_espanol,
          'show_guide', t.show_guide,
          'rates', t.rates,
          'rate_info', t.rate_info,
          'link_to_col_hq', t.link_to_col_hq,
          'entrega_final_script', t.entrega_final_script,
          'entrega_final_dub_audio', t.entrega_final_dub_audio,
          'entrega_final_script_items', t.entrega_final_script_items,
          'entrega_final_dub_audio_items', t.entrega_final_dub_audio_items
        ) as task_data
        FROM tasks t
        JOIN task_groups tg ON t.group_id = tg.id
        JOIN boards b ON tg.board_id = b.id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int as cnt FROM comments WHERE task_id = t.id
        ) cc ON true
        WHERE b.workspace_id = workspace_id_val AND b.is_hq = false
      ) sub
    ),
    'team_members', (
      SELECT json_agg(json_build_object(
        'id', tm.id,
        'name', tm.name,
        'initials', tm.initials,
        'color', tm.color,
        'email', tm.email
      ))
      FROM team_members tm
    ),
    'task_people', (
      SELECT json_agg(json_build_object(
        'task_id', tp.task_id,
        'team_member_id', tp.team_member_id
      ))
      FROM task_people tp
      WHERE tp.task_id IN (
        SELECT t.id FROM tasks t
        JOIN task_groups tg ON t.group_id = tg.id
        JOIN boards b ON tg.board_id = b.id
        WHERE b.workspace_id = workspace_id_val AND b.is_hq = false
      )
    ),
    'task_viewers', (
      SELECT json_agg(json_build_object(
        'task_id', tv.task_id,
        'team_member_id', tv.team_member_id
      ))
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

-- Add index on task_people.task_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_task_people_task_id ON task_people(task_id);

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_hq_board_data(UUID) TO authenticated;