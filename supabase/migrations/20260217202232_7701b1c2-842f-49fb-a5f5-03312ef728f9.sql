
-- Feature settings table for controlling feature visibility
CREATE TABLE public.feature_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  allowed_roles text[] NOT NULL DEFAULT '{}',
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_settings ENABLE ROW LEVEL SECURITY;

-- All internal members can read feature settings
CREATE POLICY "Internal members can read feature settings"
ON public.feature_settings
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_internal_member());

-- Only god/admin can manage feature settings
CREATE POLICY "Project managers can insert feature settings"
ON public.feature_settings
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND is_project_manager());

CREATE POLICY "Project managers can update feature settings"
ON public.feature_settings
FOR UPDATE
USING (auth.uid() IS NOT NULL AND is_project_manager());

CREATE POLICY "Project managers can delete feature settings"
ON public.feature_settings
FOR DELETE
USING (auth.uid() IS NOT NULL AND is_project_manager());

-- Insert default config for linguistic control center
INSERT INTO public.feature_settings (feature_key, enabled, allowed_roles)
VALUES ('linguistic_control_center', false, ARRAY['translator', 'admin', 'god']);
