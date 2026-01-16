-- Add two new columns for final delivery tracking (multi-select arrays)
ALTER TABLE public.tasks
ADD COLUMN entrega_final_script_items text[] DEFAULT '{}',
ADD COLUMN entrega_final_dub_audio_items text[] DEFAULT '{}';