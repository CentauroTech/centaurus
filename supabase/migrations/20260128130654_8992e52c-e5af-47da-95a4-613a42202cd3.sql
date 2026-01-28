-- Create table for storing phase guide content
CREATE TABLE public.phase_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_key text NOT NULL UNIQUE,
  title text NOT NULL,
  color text NOT NULL DEFAULT 'bg-blue-500',
  overview text NOT NULL,
  key_columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  workflow jsonb NOT NULL DEFAULT '[]'::jsonb,
  roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_phase text,
  trigger_condition text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phase_guides ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read guides
CREATE POLICY "Team members can read phase guides"
ON public.phase_guides
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_team_member());

-- Only project managers (admins) can modify guides
CREATE POLICY "Project managers can insert phase guides"
ON public.phase_guides
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND is_project_manager());

CREATE POLICY "Project managers can update phase guides"
ON public.phase_guides
FOR UPDATE
USING (auth.uid() IS NOT NULL AND is_project_manager());

CREATE POLICY "Project managers can delete phase guides"
ON public.phase_guides
FOR DELETE
USING (auth.uid() IS NOT NULL AND is_project_manager());