-- Fix is_team_member to use case-insensitive email matching
CREATE OR REPLACE FUNCTION public.is_team_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE LOWER(email) = LOWER(auth.email())
  );
$$;

-- Fix is_project_manager to use case-insensitive email matching
CREATE OR REPLACE FUNCTION public.is_project_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE LOWER(email) = LOWER(auth.email())
    AND role IN ('project_manager', 'admin', 'god')
  );
$$;