-- Add contextual metadata columns to activity_log table
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS context_board TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS context_phase TEXT;