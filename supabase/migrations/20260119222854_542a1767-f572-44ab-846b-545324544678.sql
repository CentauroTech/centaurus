-- Create table to permanently store guest task completions for invoicing
-- This persists even after task_viewers are removed during phase progression

CREATE TABLE public.guest_completed_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  phase text NOT NULL,
  role_performed text NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  delivery_comment text,
  work_order_number text,
  task_name text NOT NULL,
  titulo_aprobado_espanol text,
  locked_runtime text,
  cantidad_episodios integer,
  workspace_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Ensure unique completion per task/guest/phase/role combination
  UNIQUE(task_id, team_member_id, phase, role_performed)
);

-- Enable RLS
ALTER TABLE public.guest_completed_tasks ENABLE ROW LEVEL SECURITY;

-- Guests can view their own completed tasks
CREATE POLICY "Users can view own completed tasks"
ON public.guest_completed_tasks
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_team_member() 
  AND team_member_id = current_team_member_id()
);

-- Team members can insert completion records (via the completion flow)
CREATE POLICY "Members can insert completed tasks"
ON public.guest_completed_tasks
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND is_team_member()
);

-- Create index for faster lookups
CREATE INDEX idx_guest_completed_tasks_member ON public.guest_completed_tasks(team_member_id);
CREATE INDEX idx_guest_completed_tasks_task ON public.guest_completed_tasks(task_id);