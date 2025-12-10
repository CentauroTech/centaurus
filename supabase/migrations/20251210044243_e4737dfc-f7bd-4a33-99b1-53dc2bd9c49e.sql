-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create boards table
CREATE TABLE public.boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_hq BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_groups table
CREATE TABLE public.task_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'hsl(209, 100%, 46%)',
  is_collapsed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table with all 47 columns
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.task_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'default',
  date_assigned DATE,
  branch TEXT,
  project_manager_id UUID,
  client_name TEXT,
  entrega_miami_start DATE,
  entrega_miami_end DATE,
  entrega_mix_retakes DATE,
  entrega_cliente DATE,
  entrega_sesiones DATE,
  cantidad_episodios INTEGER,
  locked_runtime TEXT,
  final_runtime TEXT,
  servicios TEXT,
  entrega_final_dub_audio DATE,
  entrega_final_script DATE,
  prueba_de_voz BOOLEAN DEFAULT false,
  aor_needed BOOLEAN DEFAULT false,
  formato TEXT,
  lenguaje_original TEXT,
  rates NUMERIC,
  show_guide TEXT,
  titulo_aprobado_espanol TEXT,
  work_order_number TEXT,
  fase TEXT DEFAULT 'pre_production',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  dont_use_start DATE,
  dont_use_end DATE,
  aor_complete BOOLEAN DEFAULT false,
  director_id UUID,
  studio TEXT,
  tecnico_id UUID,
  qc_1_id UUID,
  qc_retakes_id UUID,
  mixer_bogota_id UUID,
  mixer_miami_id UUID,
  qc_mix_id UUID,
  traductor_id UUID,
  adaptador_id UUID,
  date_delivered DATE,
  hq TEXT,
  phase_due_date DATE,
  link_to_col_hq TEXT,
  rate_info TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create users/people table for team members
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'hsl(209, 100%, 46%)',
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_people junction table for multiple people assignments
CREATE TABLE public.task_people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  UNIQUE(task_id, team_member_id)
);

-- Create comments table for task updates/newsfeed
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comment_mentions table
CREATE TABLE public.comment_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE
);

-- Create task_files table
CREATE TABLE public.task_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  size BIGINT NOT NULL DEFAULT 0,
  uploaded_by_id UUID REFERENCES public.team_members(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity_log table
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.team_members(id),
  type TEXT NOT NULL,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Create public read policies (for now, until auth is added)
CREATE POLICY "Allow public read for workspaces" ON public.workspaces FOR SELECT USING (true);
CREATE POLICY "Allow public insert for workspaces" ON public.workspaces FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for workspaces" ON public.workspaces FOR UPDATE USING (true);
CREATE POLICY "Allow public delete for workspaces" ON public.workspaces FOR DELETE USING (true);

CREATE POLICY "Allow public read for boards" ON public.boards FOR SELECT USING (true);
CREATE POLICY "Allow public insert for boards" ON public.boards FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for boards" ON public.boards FOR UPDATE USING (true);
CREATE POLICY "Allow public delete for boards" ON public.boards FOR DELETE USING (true);

CREATE POLICY "Allow public read for task_groups" ON public.task_groups FOR SELECT USING (true);
CREATE POLICY "Allow public insert for task_groups" ON public.task_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for task_groups" ON public.task_groups FOR UPDATE USING (true);
CREATE POLICY "Allow public delete for task_groups" ON public.task_groups FOR DELETE USING (true);

CREATE POLICY "Allow public read for tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow public insert for tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for tasks" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete for tasks" ON public.tasks FOR DELETE USING (true);

CREATE POLICY "Allow public read for team_members" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Allow public insert for team_members" ON public.team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for team_members" ON public.team_members FOR UPDATE USING (true);
CREATE POLICY "Allow public delete for team_members" ON public.team_members FOR DELETE USING (true);

CREATE POLICY "Allow public read for task_people" ON public.task_people FOR SELECT USING (true);
CREATE POLICY "Allow public insert for task_people" ON public.task_people FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete for task_people" ON public.task_people FOR DELETE USING (true);

CREATE POLICY "Allow public read for comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Allow public insert for comments" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for comments" ON public.comments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete for comments" ON public.comments FOR DELETE USING (true);

CREATE POLICY "Allow public read for comment_mentions" ON public.comment_mentions FOR SELECT USING (true);
CREATE POLICY "Allow public insert for comment_mentions" ON public.comment_mentions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read for task_files" ON public.task_files FOR SELECT USING (true);
CREATE POLICY "Allow public insert for task_files" ON public.task_files FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete for task_files" ON public.task_files FOR DELETE USING (true);

CREATE POLICY "Allow public read for activity_log" ON public.activity_log FOR SELECT USING (true);
CREATE POLICY "Allow public insert for activity_log" ON public.activity_log FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_boards_workspace ON public.boards(workspace_id);
CREATE INDEX idx_task_groups_board ON public.task_groups(board_id);
CREATE INDEX idx_tasks_group ON public.tasks(group_id);
CREATE INDEX idx_comments_task ON public.comments(task_id);
CREATE INDEX idx_task_files_task ON public.task_files(task_id);
CREATE INDEX idx_activity_log_task ON public.activity_log(task_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON public.boards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_task_groups_updated_at BEFORE UPDATE ON public.task_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();