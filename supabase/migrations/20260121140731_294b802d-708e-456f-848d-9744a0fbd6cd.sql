-- Create a system workspace for tutorials if it doesn't exist
INSERT INTO public.workspaces (id, name, is_system_workspace)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tutorial System', true)
ON CONFLICT (id) DO NOTHING;

-- Create a board for tutorial tasks
INSERT INTO public.boards (id, workspace_id, name, is_hq, sort_order)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Tutorial Board', false, 0)
ON CONFLICT (id) DO NOTHING;

-- Create a task group for tutorial tasks
INSERT INTO public.task_groups (id, board_id, name, color, sort_order)
VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Practice Tasks', 'hsl(142, 76%, 36%)', 0)
ON CONFLICT (id) DO NOTHING;

-- Create a placeholder project manager (system) if doesn't exist
INSERT INTO public.team_members (id, name, initials, color, role, email)
VALUES ('00000000-0000-0000-0000-000000000000', 'System', 'SYS', 'hsl(0, 0%, 50%)', 'admin', 'system@centaurus.app')
ON CONFLICT (id) DO NOTHING;

-- Create the tutorial task
INSERT INTO public.tasks (
  id,
  group_id,
  name,
  branch,
  status,
  fase,
  work_order_number,
  locked_runtime,
  titulo_aprobado_espanol,
  guest_due_date,
  project_manager_id,
  is_private
)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000003',
  'Tutorial: Practice Task',
  'Tutorial',
  'default',
  'translating',
  'TUT-001',
  '00:30:00',
  'Tarea de Práctica - Tutorial',
  (CURRENT_DATE + INTERVAL '7 days')::date,
  '00000000-0000-0000-0000-000000000000',
  false
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  guest_due_date = EXCLUDED.guest_due_date;

-- Create RLS policy to allow guests to be assigned to tutorial task
-- (task_people insert is already allowed for team members)