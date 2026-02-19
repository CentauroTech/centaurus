
-- Add assigned_approver_id to invoices table (the billing user the vendor picks)
ALTER TABLE public.invoices
ADD COLUMN assigned_approver_id uuid REFERENCES public.team_members(id);

-- Add comment explaining the column
COMMENT ON COLUMN public.invoices.assigned_approver_id IS 'The billing-access user selected by the vendor to approve this invoice';
