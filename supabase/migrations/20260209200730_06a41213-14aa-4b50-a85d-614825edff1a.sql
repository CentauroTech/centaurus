
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_full_name TEXT;
  v_initials TEXT;
  v_color TEXT;
  v_role_type TEXT;
  v_team_member_id UUID;
  v_existing_id UUID;
BEGIN
  -- Check if a team_member with this email already exists (admin-provisioned flow)
  SELECT id INTO v_existing_id
  FROM public.team_members
  WHERE LOWER(email) = LOWER(NEW.email)
  LIMIT 1;

  -- If team member already exists, skip creation
  IF v_existing_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Extract metadata from the new user
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  v_role_type := COALESCE(NEW.raw_user_meta_data->>'role_type', 'translator');
  
  -- Build full name
  v_full_name := TRIM(v_first_name || ' ' || v_last_name);
  IF v_full_name = '' THEN
    v_full_name := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  
  -- Generate initials
  v_initials := UPPER(
    COALESCE(SUBSTRING(v_first_name FROM 1 FOR 1), '') || 
    COALESCE(SUBSTRING(v_last_name FROM 1 FOR 1), '')
  );
  IF v_initials = '' THEN
    v_initials := UPPER(SUBSTRING(SPLIT_PART(NEW.email, '@', 1) FROM 1 FOR 2));
  END IF;
  
  -- Generate random color
  v_color := 'hsl(' || (FLOOR(RANDOM() * 360))::TEXT || ', 70%, 50%)';
  
  -- Insert into team_members
  INSERT INTO public.team_members (name, initials, color, email, role)
  VALUES (v_full_name, v_initials, v_color, LOWER(NEW.email), 'member')
  RETURNING id INTO v_team_member_id;
  
  -- Insert into team_member_roles if role_type was provided
  IF v_role_type IS NOT NULL AND v_role_type != '' THEN
    INSERT INTO public.team_member_roles (team_member_id, role_type)
    VALUES (v_team_member_id, v_role_type);
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create team member for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;
