-- Create column_visibility table to control which columns team members can see
CREATE TABLE public.column_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id TEXT NOT NULL UNIQUE,
  column_label TEXT NOT NULL,
  visible_to_team_members BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.column_visibility ENABLE ROW LEVEL SECURITY;

-- Everyone can read column visibility settings
CREATE POLICY "Team members can read column visibility"
ON public.column_visibility FOR SELECT
USING (auth.uid() IS NOT NULL AND is_team_member());

-- Only god/admin can modify column visibility
CREATE POLICY "Project managers can update column visibility"
ON public.column_visibility FOR UPDATE
USING (auth.uid() IS NOT NULL AND is_project_manager());

CREATE POLICY "Project managers can insert column visibility"
ON public.column_visibility FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND is_project_manager());

CREATE POLICY "Project managers can delete column visibility"
ON public.column_visibility FOR DELETE
USING (auth.uid() IS NOT NULL AND is_project_manager());

-- Create trigger for updated_at
CREATE TRIGGER update_column_visibility_updated_at
BEFORE UPDATE ON public.column_visibility
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();