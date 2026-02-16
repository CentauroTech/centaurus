-- Add abbreviation/nickname column to tasks table
ALTER TABLE public.tasks ADD COLUMN abbreviation text NULL;