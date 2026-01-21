-- Add branch column to guest_completed_tasks
ALTER TABLE public.guest_completed_tasks
ADD COLUMN branch text;

-- Add comment
COMMENT ON COLUMN public.guest_completed_tasks.branch IS 'The task branch (Colombia, Miami, Brazil, Mexico)';