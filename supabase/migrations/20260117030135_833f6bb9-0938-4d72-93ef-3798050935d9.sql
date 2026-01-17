-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mention', 'assignment')),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  triggered_by_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create notification_preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.team_members(id) ON DELETE CASCADE,
  bell_mentions BOOLEAN NOT NULL DEFAULT true,
  bell_assignments BOOLEAN NOT NULL DEFAULT true,
  email_mentions BOOLEAN NOT NULL DEFAULT true,
  email_assignments BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_task_id ON public.notifications(task_id);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = current_team_member_id());

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = current_team_member_id());

CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = current_team_member_id());

CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND is_team_member());

-- Enable RLS on notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_preferences
CREATE POLICY "Users can view own preferences"
ON public.notification_preferences
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = current_team_member_id());

CREATE POLICY "Users can insert own preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = current_team_member_id());

CREATE POLICY "Users can update own preferences"
ON public.notification_preferences
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = current_team_member_id());

-- Trigger for updated_at on notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create a notification (checks preferences)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_task_id UUID,
  p_triggered_by_id UUID,
  p_title TEXT,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_prefs notification_preferences%ROWTYPE;
  v_should_create BOOLEAN := true;
BEGIN
  -- Get user preferences (if they exist)
  SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = p_user_id;
  
  -- Check if notification should be created based on preferences
  IF v_prefs.id IS NOT NULL THEN
    IF p_type = 'mention' AND NOT v_prefs.bell_mentions THEN
      v_should_create := false;
    ELSIF p_type = 'assignment' AND NOT v_prefs.bell_assignments THEN
      v_should_create := false;
    END IF;
  END IF;
  
  IF v_should_create THEN
    INSERT INTO notifications (user_id, type, task_id, triggered_by_id, title, message)
    VALUES (p_user_id, p_type, p_task_id, p_triggered_by_id, p_title, p_message)
    RETURNING id INTO v_notification_id;
  END IF;
  
  RETURN v_notification_id;
END;
$$;

-- Trigger function for mention notifications
CREATE OR REPLACE FUNCTION public.notify_on_mention()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id UUID;
  v_task_name TEXT;
  v_triggered_by_id UUID;
  v_triggered_by_name TEXT;
BEGIN
  -- Get the task_id from the comment
  SELECT c.task_id, t.name INTO v_task_id, v_task_name
  FROM comments c
  JOIN tasks t ON c.task_id = t.id
  WHERE c.id = NEW.comment_id;
  
  -- Get the person who wrote the comment (triggered by)
  SELECT c.user_id INTO v_triggered_by_id
  FROM comments c
  WHERE c.id = NEW.comment_id;
  
  -- Get triggered by name
  SELECT name INTO v_triggered_by_name
  FROM team_members
  WHERE id = v_triggered_by_id;
  
  -- Skip if user mentioned themselves
  IF NEW.mentioned_user_id = v_triggered_by_id THEN
    RETURN NEW;
  END IF;
  
  -- Create notification
  PERFORM create_notification(
    NEW.mentioned_user_id,
    'mention',
    v_task_id,
    v_triggered_by_id,
    v_triggered_by_name || ' mentioned you',
    'in ' || COALESCE(v_task_name, 'a task')
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for mentions
CREATE TRIGGER trigger_notify_on_mention
AFTER INSERT ON public.comment_mentions
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_mention();

-- Trigger function for assignment notifications
CREATE OR REPLACE FUNCTION public.notify_on_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_column_names TEXT[] := ARRAY[
    'project_manager_id', 'director_id', 'adaptador_id', 'traductor_id', 
    'tecnico_id', 'mixer_bogota_id', 'mixer_miami_id', 'qc_1_id', 
    'qc_mix_id', 'qc_retakes_id'
  ];
  v_role_labels TEXT[] := ARRAY[
    'Project Manager', 'Director', 'Adaptador', 'Traductor',
    'Técnico', 'Mixer Bogotá', 'Mixer Miami', 'QC 1',
    'QC Mix', 'QC Retakes'
  ];
  v_col TEXT;
  v_role_label TEXT;
  v_old_val UUID;
  v_new_val UUID;
  v_current_user_id UUID;
  v_current_user_name TEXT;
  i INTEGER;
BEGIN
  -- Get current user
  v_current_user_id := current_team_member_id();
  SELECT name INTO v_current_user_name FROM team_members WHERE id = v_current_user_id;
  
  -- Loop through assignment columns
  FOR i IN 1..array_length(v_column_names, 1) LOOP
    v_col := v_column_names[i];
    v_role_label := v_role_labels[i];
    
    -- Get old and new values using dynamic comparison
    EXECUTE format('SELECT $1.%I, $2.%I', v_col, v_col) 
    INTO v_old_val, v_new_val
    USING OLD, NEW;
    
    -- Check if this column changed and has a new assignee
    IF v_new_val IS DISTINCT FROM v_old_val AND v_new_val IS NOT NULL THEN
      -- Skip if user assigned themselves
      IF v_new_val = v_current_user_id THEN
        CONTINUE;
      END IF;
      
      -- Create notification for the new assignee
      PERFORM create_notification(
        v_new_val,
        'assignment',
        NEW.id,
        v_current_user_id,
        'You were assigned as ' || v_role_label,
        'to ' || COALESCE(NEW.name, 'a task') || COALESCE(' by ' || v_current_user_name, '')
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for assignments
CREATE TRIGGER trigger_notify_on_assignment
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_assignment();