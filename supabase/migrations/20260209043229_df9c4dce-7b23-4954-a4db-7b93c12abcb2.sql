
CREATE OR REPLACE FUNCTION public.start_conversation(other_member_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_member_id uuid;
  v_conversation_id uuid;
BEGIN
  -- Get current user's team member id
  v_current_member_id := current_team_member_id();
  IF v_current_member_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check if conversation already exists between these two users
  SELECT cp1.conversation_id INTO v_conversation_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.team_member_id = v_current_member_id
    AND cp2.team_member_id = other_member_id
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO v_conversation_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, team_member_id)
  VALUES 
    (v_conversation_id, v_current_member_id),
    (v_conversation_id, other_member_id);

  RETURN v_conversation_id;
END;
$$;
