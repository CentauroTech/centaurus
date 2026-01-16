-- Add genre column to tasks table
ALTER TABLE public.tasks
ADD COLUMN genre text;