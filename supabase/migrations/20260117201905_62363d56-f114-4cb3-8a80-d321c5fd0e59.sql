-- Create function to check if user is a centauro.com team member (full access)
CREATE OR REPLACE FUNCTION public.is_centauro_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.email() IS NOT NULL 
    AND LOWER(auth.email()) LIKE '%@centauro.com'
    AND EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE LOWER(email) = LOWER(auth.email())
    );
$$;

-- Create function to check if user is a guest (in team_members but not @centauro.com)
CREATE OR REPLACE FUNCTION public.is_guest()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.email() IS NOT NULL
    AND LOWER(auth.email()) NOT LIKE '%@centauro.com'
    AND EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE LOWER(email) = LOWER(auth.email())
    );
$$;

-- Update workspaces policy: only centauro members can see all workspaces
DROP POLICY IF EXISTS "Authenticated members can read workspaces" ON public.workspaces;
CREATE POLICY "Centauro members can read workspaces"
ON public.workspaces
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_centauro_member());

-- Update boards policy: only centauro members can see all boards
DROP POLICY IF EXISTS "Authenticated members can read boards" ON public.boards;
CREATE POLICY "Centauro members can read boards"
ON public.boards
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_centauro_member());

-- Update task_groups policy: only centauro members can see all task groups
DROP POLICY IF EXISTS "Authenticated members can read task_groups" ON public.task_groups;
CREATE POLICY "Centauro members can read task_groups"
ON public.task_groups
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_centauro_member());