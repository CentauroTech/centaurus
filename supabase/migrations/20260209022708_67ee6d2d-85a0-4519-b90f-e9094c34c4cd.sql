
-- Create junction table for per-member column visibility
CREATE TABLE public.column_member_visibility (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  column_id text NOT NULL,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(column_id, team_member_id)
);

-- Enable RLS
ALTER TABLE public.column_member_visibility ENABLE ROW LEVEL SECURITY;

-- Team members can read
CREATE POLICY "Team members can read column_member_visibility"
ON public.column_member_visibility
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_team_member());

-- Project managers can insert
CREATE POLICY "Project managers can insert column_member_visibility"
ON public.column_member_visibility
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND is_project_manager());

-- Project managers can delete
CREATE POLICY "Project managers can delete column_member_visibility"
ON public.column_member_visibility
FOR DELETE
USING (auth.uid() IS NOT NULL AND is_project_manager());
