-- Add target_language column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS target_language text;