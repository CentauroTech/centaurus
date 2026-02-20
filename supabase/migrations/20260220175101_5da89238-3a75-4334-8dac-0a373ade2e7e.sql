-- Allow project_manager_id to be nullable so PMs can be removed from tasks
ALTER TABLE public.tasks ALTER COLUMN project_manager_id DROP NOT NULL;