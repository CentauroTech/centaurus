-- =====================================================
-- SECURITY FIX: Replace permissive RLS policies with authenticated access
-- =====================================================

-- Create helper function to check if current user is a team member
CREATE OR REPLACE FUNCTION public.is_team_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE email = auth.email()
  );
$$;

-- Create helper function to check if current user is a project manager
CREATE OR REPLACE FUNCTION public.is_project_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE email = auth.email() 
    AND role = 'project_manager'
  );
$$;

-- Create helper function to get current team member id
CREATE OR REPLACE FUNCTION public.current_team_member_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.team_members 
  WHERE email = auth.email()
  LIMIT 1;
$$;

-- =====================================================
-- WORKSPACES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow public read for workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Allow public insert for workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Allow public update for workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Allow public delete for workspaces" ON public.workspaces;

CREATE POLICY "Authenticated members can read workspaces" ON public.workspaces
  FOR SELECT USING (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Project managers can insert workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND public.is_project_manager());

CREATE POLICY "Project managers can update workspaces" ON public.workspaces
  FOR UPDATE USING (auth.uid() IS NOT NULL AND public.is_project_manager());

CREATE POLICY "Project managers can delete workspaces" ON public.workspaces
  FOR DELETE USING (auth.uid() IS NOT NULL AND public.is_project_manager());

-- =====================================================
-- BOARDS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow public read for boards" ON public.boards;
DROP POLICY IF EXISTS "Allow public insert for boards" ON public.boards;
DROP POLICY IF EXISTS "Allow public update for boards" ON public.boards;
DROP POLICY IF EXISTS "Allow public delete for boards" ON public.boards;

CREATE POLICY "Authenticated members can read boards" ON public.boards
  FOR SELECT USING (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Project managers can insert boards" ON public.boards
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND public.is_project_manager());

CREATE POLICY "Project managers can update boards" ON public.boards
  FOR UPDATE USING (auth.uid() IS NOT NULL AND public.is_project_manager());

CREATE POLICY "Project managers can delete boards" ON public.boards
  FOR DELETE USING (auth.uid() IS NOT NULL AND public.is_project_manager());

-- =====================================================
-- TASK_GROUPS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow public read for task_groups" ON public.task_groups;
DROP POLICY IF EXISTS "Allow public insert for task_groups" ON public.task_groups;
DROP POLICY IF EXISTS "Allow public update for task_groups" ON public.task_groups;
DROP POLICY IF EXISTS "Allow public delete for task_groups" ON public.task_groups;

CREATE POLICY "Authenticated members can read task_groups" ON public.task_groups
  FOR SELECT USING (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Members can insert task_groups" ON public.task_groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Members can update task_groups" ON public.task_groups
  FOR UPDATE USING (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Project managers can delete task_groups" ON public.task_groups
  FOR DELETE USING (auth.uid() IS NOT NULL AND public.is_project_manager());

-- =====================================================
-- TASKS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow public read for tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public insert for tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public update for tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public delete for tasks" ON public.tasks;

CREATE POLICY "Authenticated members can read tasks" ON public.tasks
  FOR SELECT USING (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Members can insert tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Members can update tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Project managers can delete tasks" ON public.tasks
  FOR DELETE USING (auth.uid() IS NOT NULL AND public.is_project_manager());

-- =====================================================
-- TEAM_MEMBERS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow public read for team_members" ON public.team_members;
DROP POLICY IF EXISTS "Allow public insert for team_members" ON public.team_members;
DROP POLICY IF EXISTS "Allow public update for team_members" ON public.team_members;
DROP POLICY IF EXISTS "Allow public delete for team_members" ON public.team_members;

CREATE POLICY "Authenticated members can read team_members" ON public.team_members
  FOR SELECT USING (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Project managers can insert team_members" ON public.team_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND public.is_project_manager());

CREATE POLICY "Project managers can update team_members" ON public.team_members
  FOR UPDATE USING (auth.uid() IS NOT NULL AND public.is_project_manager());

CREATE POLICY "Project managers can delete team_members" ON public.team_members
  FOR DELETE USING (auth.uid() IS NOT NULL AND public.is_project_manager());

-- =====================================================
-- TASK_PEOPLE TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow public read for task_people" ON public.task_people;
DROP POLICY IF EXISTS "Allow public insert for task_people" ON public.task_people;
DROP POLICY IF EXISTS "Allow public delete for task_people" ON public.task_people;

CREATE POLICY "Authenticated members can read task_people" ON public.task_people
  FOR SELECT USING (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Members can insert task_people" ON public.task_people
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Members can delete task_people" ON public.task_people
  FOR DELETE USING (auth.uid() IS NOT NULL AND public.is_team_member());

-- =====================================================
-- COMMENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow public read for comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public insert for comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public update for comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public delete for comments" ON public.comments;

CREATE POLICY "Authenticated members can read comments" ON public.comments
  FOR SELECT USING (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Members can insert comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Members can update own comments" ON public.comments
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    user_id = public.current_team_member_id()
  );

CREATE POLICY "Members can delete own comments" ON public.comments
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND 
    user_id = public.current_team_member_id()
  );

-- =====================================================
-- COMMENT_MENTIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow public read for comment_mentions" ON public.comment_mentions;
DROP POLICY IF EXISTS "Allow public insert for comment_mentions" ON public.comment_mentions;

CREATE POLICY "Authenticated members can read comment_mentions" ON public.comment_mentions
  FOR SELECT USING (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Members can insert comment_mentions" ON public.comment_mentions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND public.is_team_member());

-- =====================================================
-- ACTIVITY_LOG TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow public read for activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Allow public insert for activity_log" ON public.activity_log;

CREATE POLICY "Authenticated members can read activity_log" ON public.activity_log
  FOR SELECT USING (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Members can insert activity_log" ON public.activity_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND public.is_team_member());

-- =====================================================
-- TASK_FILES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow public read for task_files" ON public.task_files;
DROP POLICY IF EXISTS "Allow public insert for task_files" ON public.task_files;
DROP POLICY IF EXISTS "Allow public delete for task_files" ON public.task_files;

CREATE POLICY "Authenticated members can read task_files" ON public.task_files
  FOR SELECT USING (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Members can insert task_files" ON public.task_files
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND public.is_team_member());

CREATE POLICY "Members can delete task_files" ON public.task_files
  FOR DELETE USING (auth.uid() IS NOT NULL AND public.is_team_member());