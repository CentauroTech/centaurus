-- Create table for storing user guide preferences
CREATE TABLE public.user_guide_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  dont_show_again boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, board_id)
);

-- Enable RLS
ALTER TABLE public.user_guide_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own guide preferences"
ON public.user_guide_preferences
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = current_team_member_id());

-- Users can insert their own preferences
CREATE POLICY "Users can insert own guide preferences"
ON public.user_guide_preferences
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = current_team_member_id());

-- Users can update their own preferences
CREATE POLICY "Users can update own guide preferences"
ON public.user_guide_preferences
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = current_team_member_id());

-- Add updated_at trigger
CREATE TRIGGER update_user_guide_preferences_updated_at
BEFORE UPDATE ON public.user_guide_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();