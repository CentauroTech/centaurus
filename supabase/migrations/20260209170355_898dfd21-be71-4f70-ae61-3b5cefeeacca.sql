
CREATE OR REPLACE FUNCTION public.move_task_to_next_phase(p_task_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_group_id uuid;
  v_current_board_id uuid;
  v_current_board_name text;
  v_workspace_id uuid;
  v_prueba_de_voz text;
  v_current_phase text;
  v_next_phase text;
  v_prefix text;
  v_next_board record;
  v_target_group_id uuid;
  v_next_phase_name text;
  v_current_date date := CURRENT_DATE;
  v_now timestamp := NOW();
  v_removed_viewers_count int;
  -- Auto-privacy variables
  v_role_column text;
  v_role_member_id uuid;
  v_role_member_email text;
  v_is_guest boolean;
  v_guest_due date;
  v_normalized_next text;
BEGIN
  -- Get task details
  SELECT t.group_id, t.prueba_de_voz
  INTO v_current_group_id, v_prueba_de_voz
  FROM tasks t
  WHERE t.id = p_task_id;

  IF v_current_group_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;

  -- Get current board info
  SELECT tg.board_id INTO v_current_board_id
  FROM task_groups tg
  WHERE tg.id = v_current_group_id;

  SELECT b.name, b.workspace_id INTO v_current_board_name, v_workspace_id
  FROM boards b
  WHERE b.id = v_current_board_id;

  IF v_current_board_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Board not found');
  END IF;

  -- Extract phase from board name
  v_current_phase := CASE 
    WHEN POSITION('-' IN v_current_board_name) > 0 
    THEN SUBSTRING(v_current_board_name FROM POSITION('-' IN v_current_board_name) + 1)
    ELSE v_current_board_name
  END;

  -- Get prefix
  v_prefix := SPLIT_PART(v_current_board_name, '-', 1);

  -- Determine next phase
  v_next_phase := CASE LOWER(REGEXP_REPLACE(v_current_phase, '[^a-zA-Z0-9]', '', 'g'))
    WHEN 'kickoff' THEN 'Assets'
    WHEN 'assets' THEN 'Translation'
    WHEN 'translation' THEN 'Adapting'
    WHEN 'adapting' THEN 
      CASE WHEN v_prueba_de_voz = 'Yes' THEN 'Voicetests' ELSE 'Recording' END
    WHEN 'voicetests' THEN 'Recording'
    WHEN 'recording' THEN 'Premix'
    WHEN 'premix' THEN 'QC-Premix'
    WHEN 'qcpremix' THEN 'Retakes'
    WHEN 'qc1' THEN 'Retakes'
    WHEN 'retakes' THEN 'QC-Retakes'
    WHEN 'qcretakes' THEN 'Mix'
    WHEN 'mix' THEN 'QC-Mix'
    WHEN 'mixbogota' THEN 'QC-Mix'
    WHEN 'qcmix' THEN 'Mixretakes'
    WHEN 'mixretakes' THEN 'Deliveries'
    ELSE NULL
  END;

  IF v_next_phase IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already at final phase or unknown phase');
  END IF;

  -- Find the next board
  SELECT b.id, b.name INTO v_next_board
  FROM boards b
  WHERE b.workspace_id = v_workspace_id
    AND b.is_hq = false
    AND b.name LIKE v_prefix || '-%'
    AND LOWER(REGEXP_REPLACE(
      SUBSTRING(b.name FROM POSITION('-' IN b.name) + 1), 
      '[^a-zA-Z0-9]', '', 'g'
    )) = LOWER(REGEXP_REPLACE(v_next_phase, '[^a-zA-Z0-9]', '', 'g'))
  LIMIT 1;

  IF v_next_board IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Next phase board not found: ' || v_next_phase);
  END IF;

  -- Get or create task group in target board
  SELECT tg.id INTO v_target_group_id
  FROM task_groups tg
  WHERE tg.board_id = v_next_board.id
  ORDER BY tg.sort_order
  LIMIT 1;

  IF v_target_group_id IS NULL THEN
    INSERT INTO task_groups (board_id, name, color)
    VALUES (v_next_board.id, 'Tasks', 'hsl(209, 100%, 46%)')
    RETURNING id INTO v_target_group_id;
  END IF;

  -- Extract phase name from next board
  v_next_phase_name := CASE 
    WHEN POSITION('-' IN v_next_board.name) > 0 
    THEN SUBSTRING(v_next_board.name FROM POSITION('-' IN v_next_board.name) + 1)
    ELSE v_next_board.name
  END;

  -- Remove all guest viewers before moving
  DELETE FROM task_viewers WHERE task_id = p_task_id;
  GET DIAGNOSTICS v_removed_viewers_count = ROW_COUNT;

  -- Move the task
  UPDATE tasks
  SET 
    group_id = v_target_group_id,
    status = 'default',
    fase = v_next_phase_name,
    last_updated = v_now,
    date_assigned = v_current_date,
    date_delivered = NULL,
    guest_due_date = NULL
  WHERE id = p_task_id;

  -- Log the phase change
  INSERT INTO activity_log (task_id, type, field, old_value, new_value, user_id)
  VALUES (p_task_id, 'phase_change', 'fase', v_current_phase, v_next_phase_name, p_user_id);

  -- Log the board change
  INSERT INTO activity_log (task_id, type, field, old_value, new_value, user_id)
  VALUES (p_task_id, 'field_change', 'board', v_current_board_name, v_next_board.name, p_user_id);

  -- === AUTO-PRIVACY: Check if the role column for this phase has a guest assigned ===
  v_normalized_next := LOWER(REGEXP_REPLACE(v_next_phase_name, '[^a-zA-Z0-9]', '', 'g'));
  
  v_role_column := CASE v_normalized_next
    WHEN 'translation' THEN 'traductor_id'
    WHEN 'adapting' THEN 'adaptador_id'
    WHEN 'qcpremix' THEN 'qc_1_id'
    WHEN 'qcretakes' THEN 'qc_retakes_id'
    WHEN 'qcmix' THEN 'qc_mix_id'
    WHEN 'premix' THEN 
      CASE WHEN v_prefix IN ('Mia', 'SE') THEN 'mixer_miami_id' ELSE 'mixer_bogota_id' END
    WHEN 'mix' THEN 
      CASE WHEN v_prefix IN ('Mia', 'SE') THEN 'mixer_miami_id' ELSE 'mixer_bogota_id' END
    ELSE NULL
  END;

  IF v_role_column IS NOT NULL THEN
    -- Get the member ID from the role column
    EXECUTE format('SELECT %I FROM tasks WHERE id = $1', v_role_column)
    INTO v_role_member_id USING p_task_id;

    IF v_role_member_id IS NOT NULL THEN
      -- Check if this person is a guest (non-@centauro.com email)
      SELECT email INTO v_role_member_email FROM team_members WHERE id = v_role_member_id;
      v_is_guest := (v_role_member_email IS NULL OR LOWER(v_role_member_email) NOT LIKE '%@centauro.com');

      IF v_is_guest THEN
        -- Calculate guest_due_date (+1 business day)
        v_guest_due := v_current_date + 1;
        WHILE EXTRACT(DOW FROM v_guest_due) IN (0, 6) LOOP
          v_guest_due := v_guest_due + 1;
        END LOOP;

        -- Make task private and set guest due date
        UPDATE tasks 
        SET is_private = true, guest_due_date = v_guest_due
        WHERE id = p_task_id;

        -- Add as task viewer
        INSERT INTO task_viewers (task_id, team_member_id)
        VALUES (p_task_id, v_role_member_id);

        -- Log the auto-privacy action
        INSERT INTO activity_log (task_id, type, field, old_value, new_value, user_id)
        VALUES (p_task_id, 'field_change', 'is_private', 'false', 'true', p_user_id);
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'from_board', v_current_board_name, 
    'to_board', v_next_board.name,
    'new_phase', v_next_phase_name,
    'viewers_removed', v_removed_viewers_count
  );
END;
$function$;
