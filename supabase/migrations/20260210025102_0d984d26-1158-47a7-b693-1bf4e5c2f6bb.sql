
-- Add individual phase due date columns for Miami workflow boards
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assets_due_date text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS translation_due_date text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS adapting_due_date text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS voice_tests_due_date text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recording_due_date text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS premix_due_date text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS qc_premix_due_date text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS retakes_due_date text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS qc_retakes_due_date text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS mix_due_date text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS qc_mix_due_date text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS mix_retakes_due_date text;
