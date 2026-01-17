-- Phase 1: Core task columns for timer and guest tracking
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS guest_due_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS delivery_comment TEXT;

-- Phase 2: Comment isolation - guests only see guest-visible comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_guest_visible BOOLEAN NOT NULL DEFAULT false;

-- Phase 3: File access control for guest isolation
ALTER TABLE task_files ADD COLUMN IF NOT EXISTS is_guest_accessible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE task_files ADD COLUMN IF NOT EXISTS file_category TEXT NOT NULL DEFAULT 'general';
ALTER TABLE task_files ADD COLUMN IF NOT EXISTS phase TEXT;

-- Phase 4: Admin workspace flag
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS is_system_workspace BOOLEAN NOT NULL DEFAULT false;

-- Create Admin workspace
INSERT INTO workspaces (id, name, is_system_workspace) 
VALUES ('44444444-4444-4444-4444-444444444444', 'Admin', true)
ON CONFLICT (id) DO UPDATE SET is_system_workspace = true;

-- Create Production Files Repository board
INSERT INTO boards (id, workspace_id, name, is_hq, sort_order) 
VALUES (
  '55555555-5555-5555-5555-555555555555', 
  '44444444-4444-4444-4444-444444444444', 
  'Production Files Repository', 
  false, 
  0
)
ON CONFLICT (id) DO NOTHING;

-- Update RLS for workspaces - only admins can see system workspaces
DROP POLICY IF EXISTS "Centauro members can read workspaces" ON workspaces;
CREATE POLICY "Centauro members can read workspaces" ON workspaces
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_centauro_member()
  AND (
    is_system_workspace = false 
    OR is_project_manager()
  )
);

-- Update comments RLS to respect guest visibility
DROP POLICY IF EXISTS "Authenticated members can view comments" ON comments;
CREATE POLICY "Authenticated members can view comments" ON comments
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_team_member() 
  AND can_view_task(task_id)
  AND (
    is_centauro_member() 
    OR is_guest_visible = true
  )
);

-- Update task_files RLS to respect guest accessibility
DROP POLICY IF EXISTS "Authenticated members can view task_files" ON task_files;
CREATE POLICY "Authenticated members can view task_files" ON task_files
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_team_member() 
  AND can_view_task(task_id)
  AND (
    is_centauro_member() 
    OR is_guest_accessible = true
  )
);