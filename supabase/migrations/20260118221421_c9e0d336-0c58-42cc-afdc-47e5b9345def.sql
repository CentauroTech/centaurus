-- Add kickoff_brief column to tasks table for storing the full brief text
ALTER TABLE public.tasks 
ADD COLUMN kickoff_brief TEXT;