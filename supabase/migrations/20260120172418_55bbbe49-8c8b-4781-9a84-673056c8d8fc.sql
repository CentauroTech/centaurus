-- Add workspace_id column to phase_automations
ALTER TABLE phase_automations 
ADD COLUMN workspace_id uuid REFERENCES workspaces(id);

-- Migrate existing automations to Miami workspace
UPDATE phase_automations 
SET workspace_id = (SELECT id FROM workspaces WHERE name = 'Miami' LIMIT 1)
WHERE workspace_id IS NULL;

-- Make workspace_id NOT NULL after migration
ALTER TABLE phase_automations 
ALTER COLUMN workspace_id SET NOT NULL;

-- Drop existing unique constraint/index if it exists
DROP INDEX IF EXISTS phase_automations_phase_team_member_idx;

-- Create new unique index that includes workspace_id
CREATE UNIQUE INDEX phase_automations_workspace_phase_member_idx 
ON phase_automations(workspace_id, phase, team_member_id);

-- Add index for efficient querying by workspace
CREATE INDEX phase_automations_workspace_idx ON phase_automations(workspace_id);