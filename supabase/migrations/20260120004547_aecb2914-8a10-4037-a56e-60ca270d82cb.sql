-- Create phase_automations table
CREATE TABLE public.phase_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase TEXT NOT NULL,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phase, team_member_id)
);

-- Enable RLS
ALTER TABLE public.phase_automations ENABLE ROW LEVEL SECURITY;

-- Policies: All team members can read, project managers can manage
CREATE POLICY "Team members can read phase automations"
  ON public.phase_automations FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_team_member());

CREATE POLICY "Project managers can insert phase automations"
  ON public.phase_automations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND is_project_manager());

CREATE POLICY "Project managers can update phase automations"
  ON public.phase_automations FOR UPDATE
  USING (auth.uid() IS NOT NULL AND is_project_manager());

CREATE POLICY "Project managers can delete phase automations"
  ON public.phase_automations FOR DELETE
  USING (auth.uid() IS NOT NULL AND is_project_manager());

-- Seed initial data from current hardcoded values
INSERT INTO public.phase_automations (phase, team_member_id)
SELECT 'assets', id FROM team_members WHERE name = 'Natalia Aparicio'
UNION ALL
SELECT 'translation', id FROM team_members WHERE name = 'Julio Neri'
UNION ALL
SELECT 'adapting', id FROM team_members WHERE name = 'Julio Neri'
UNION ALL
SELECT 'voicetests', id FROM team_members WHERE name = 'Julio Neri'
UNION ALL
SELECT 'voicetests', id FROM team_members WHERE name = 'Judith Noguera'
UNION ALL
SELECT 'recording', id FROM team_members WHERE name = 'Judith Noguera'
UNION ALL
SELECT 'premix', id FROM team_members WHERE name = 'Judith Noguera'
UNION ALL
SELECT 'qcpremix', id FROM team_members WHERE name = 'Natalia Aparicio'
UNION ALL
SELECT 'retakes', id FROM team_members WHERE name = 'Judith Noguera'
UNION ALL
SELECT 'qcretakes', id FROM team_members WHERE name = 'Natalia Aparicio'
UNION ALL
SELECT 'mix', id FROM team_members WHERE name = 'Natalia Aparicio'
UNION ALL
SELECT 'mixretakes', id FROM team_members WHERE name = 'Natalia Aparicio'
UNION ALL
SELECT 'deliveries', id FROM team_members WHERE name = 'Natalia Aparicio';