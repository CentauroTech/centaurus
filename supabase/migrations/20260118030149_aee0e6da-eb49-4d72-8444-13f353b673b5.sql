-- Create team_member_branches junction table
CREATE TABLE public.team_member_branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  branch TEXT NOT NULL CHECK (branch IN ('Colombia', 'Miami', 'Brazil', 'Mexico')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_member_id, branch)
);

-- Create team_member_roles junction table
CREATE TABLE public.team_member_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN ('translator', 'adapter', 'mixer', 'qc_premix', 'qc_mix', 'director', 'tecnico')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_member_id, role_type)
);

-- Enable RLS
ALTER TABLE public.team_member_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_member_branches
CREATE POLICY "Team members can view branches"
ON public.team_member_branches
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_team_member());

CREATE POLICY "Project managers can insert branches"
ON public.team_member_branches
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND is_project_manager());

CREATE POLICY "Project managers can update branches"
ON public.team_member_branches
FOR UPDATE
USING (auth.uid() IS NOT NULL AND is_project_manager());

CREATE POLICY "Project managers can delete branches"
ON public.team_member_branches
FOR DELETE
USING (auth.uid() IS NOT NULL AND is_project_manager());

-- RLS policies for team_member_roles
CREATE POLICY "Team members can view roles"
ON public.team_member_roles
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_team_member());

CREATE POLICY "Project managers can insert roles"
ON public.team_member_roles
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND is_project_manager());

CREATE POLICY "Project managers can update roles"
ON public.team_member_roles
FOR UPDATE
USING (auth.uid() IS NOT NULL AND is_project_manager());

CREATE POLICY "Project managers can delete roles"
ON public.team_member_roles
FOR DELETE
USING (auth.uid() IS NOT NULL AND is_project_manager());

-- Add indexes for performance
CREATE INDEX idx_team_member_branches_member ON public.team_member_branches(team_member_id);
CREATE INDEX idx_team_member_branches_branch ON public.team_member_branches(branch);
CREATE INDEX idx_team_member_roles_member ON public.team_member_roles(team_member_id);
CREATE INDEX idx_team_member_roles_type ON public.team_member_roles(role_type);