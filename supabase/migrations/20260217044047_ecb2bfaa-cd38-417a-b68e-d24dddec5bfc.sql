
-- Add asignacion column to tasks
ALTER TABLE public.tasks ADD COLUMN asignacion text DEFAULT NULL;

-- Create user language preferences table
CREATE TABLE public.user_language_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id uuid NOT NULL UNIQUE,
  language text NOT NULL DEFAULT 'en',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_language_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own language preference"
ON public.user_language_preferences FOR SELECT
USING (auth.uid() IS NOT NULL AND team_member_id = current_team_member_id());

CREATE POLICY "Users can insert own language preference"
ON public.user_language_preferences FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND team_member_id = current_team_member_id());

CREATE POLICY "Users can update own language preference"
ON public.user_language_preferences FOR UPDATE
USING (auth.uid() IS NOT NULL AND team_member_id = current_team_member_id());

-- Trigger for updated_at
CREATE TRIGGER update_user_language_preferences_updated_at
BEFORE UPDATE ON public.user_language_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
