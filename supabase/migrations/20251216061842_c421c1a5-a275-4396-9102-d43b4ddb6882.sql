-- Add role to team_members to distinguish guests from regular members
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

-- Add is_private flag to tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- Create index for faster privacy queries
CREATE INDEX IF NOT EXISTS idx_tasks_is_private ON public.tasks(is_private);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON public.team_members(role);