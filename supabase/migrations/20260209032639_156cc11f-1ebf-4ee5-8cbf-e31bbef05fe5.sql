
-- Create a function that checks if the user is a non-guest team member
-- This replaces is_centauro_member() for access control, using role instead of email domain
CREATE OR REPLACE FUNCTION public.is_internal_member()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE LOWER(email) = LOWER(auth.email())
    AND role IN ('god', 'admin', 'project_manager', 'member', 'team_member')
  );
$$;

-- Update workspaces SELECT policy
DROP POLICY IF EXISTS "Centauro members can read workspaces" ON public.workspaces;
CREATE POLICY "Internal members can read workspaces"
ON public.workspaces
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) 
  AND is_internal_member() 
  AND ((is_system_workspace = false) OR is_project_manager())
);

-- Update boards SELECT policy
DROP POLICY IF EXISTS "Centauro members can read boards" ON public.boards;
CREATE POLICY "Internal members can read boards"
ON public.boards
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) 
  AND is_internal_member()
);

-- Update task_groups SELECT policy
DROP POLICY IF EXISTS "Centauro members can read task_groups" ON public.task_groups;
CREATE POLICY "Internal members can read task_groups"
ON public.task_groups
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) 
  AND is_internal_member()
);
