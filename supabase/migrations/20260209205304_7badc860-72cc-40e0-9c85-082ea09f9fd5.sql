
-- Table to persist column order per board (set by God, read by everyone)
CREATE TABLE public.board_column_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  column_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_locked boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES public.team_members(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(board_id)
);

-- Enable RLS
ALTER TABLE public.board_column_orders ENABLE ROW LEVEL SECURITY;

-- All internal members can read
CREATE POLICY "Internal members can read board_column_orders"
ON public.board_column_orders
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_internal_member());

-- Only god/admin (project managers) can insert
CREATE POLICY "Project managers can insert board_column_orders"
ON public.board_column_orders
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND is_project_manager());

-- Only god/admin can update
CREATE POLICY "Project managers can update board_column_orders"
ON public.board_column_orders
FOR UPDATE
USING (auth.uid() IS NOT NULL AND is_project_manager());

-- Only god/admin can delete
CREATE POLICY "Project managers can delete board_column_orders"
ON public.board_column_orders
FOR DELETE
USING (auth.uid() IS NOT NULL AND is_project_manager());
