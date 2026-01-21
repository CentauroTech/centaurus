-- Drop existing constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with all notification types including invoice-related
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY['mention'::text, 'assignment'::text, 'invoice_submitted'::text, 'invoice_approved'::text, 'invoice_rejected'::text, 'invoice_paid'::text]));