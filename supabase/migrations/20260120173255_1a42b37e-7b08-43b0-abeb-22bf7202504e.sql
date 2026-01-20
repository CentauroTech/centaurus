-- Create invoices table for guest billing
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  
  -- Billing details
  billing_name text NOT NULL,
  billing_address text,
  billing_city text,
  billing_country text,
  billing_tax_id text,
  billing_bank_name text,
  billing_bank_account text,
  billing_bank_routing text,
  billing_notes text,
  
  -- Payment terms
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  payment_instructions text,
  
  -- Totals
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  
  -- Admin feedback
  rejection_reason text,
  approved_by_id uuid REFERENCES public.team_members(id),
  approved_at timestamp with time zone,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create invoice line items table (links to completed tasks)
CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  completed_task_id uuid REFERENCES public.guest_completed_tasks(id),
  
  -- Task details (copied at invoice time for permanence)
  description text NOT NULL,
  work_order_number text,
  phase text,
  role_performed text,
  runtime text,
  
  -- Billing
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Guests can view and manage their own invoices
CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_team_member() AND team_member_id = current_team_member_id());

CREATE POLICY "Users can insert own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND is_team_member() AND team_member_id = current_team_member_id());

CREATE POLICY "Users can update own draft invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() IS NOT NULL AND is_team_member() AND team_member_id = current_team_member_id() AND status IN ('draft', 'rejected'));

CREATE POLICY "Users can delete own draft invoices"
  ON public.invoices FOR DELETE
  USING (auth.uid() IS NOT NULL AND is_team_member() AND team_member_id = current_team_member_id() AND status = 'draft');

-- Project managers can view all invoices and update status
CREATE POLICY "PMs can view all invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_project_manager());

CREATE POLICY "PMs can update invoice status"
  ON public.invoices FOR UPDATE
  USING (auth.uid() IS NOT NULL AND is_project_manager());

-- Invoice items policies
CREATE POLICY "Users can view own invoice items"
  ON public.invoice_items FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_team_member() AND EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_items.invoice_id 
    AND (i.team_member_id = current_team_member_id() OR is_project_manager())
  ));

CREATE POLICY "Users can insert own invoice items"
  ON public.invoice_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND is_team_member() AND EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_items.invoice_id 
    AND i.team_member_id = current_team_member_id()
    AND i.status IN ('draft', 'rejected')
  ));

CREATE POLICY "Users can update own invoice items"
  ON public.invoice_items FOR UPDATE
  USING (auth.uid() IS NOT NULL AND is_team_member() AND EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_items.invoice_id 
    AND i.team_member_id = current_team_member_id()
    AND i.status IN ('draft', 'rejected')
  ));

CREATE POLICY "Users can delete own invoice items"
  ON public.invoice_items FOR DELETE
  USING (auth.uid() IS NOT NULL AND is_team_member() AND EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_items.invoice_id 
    AND i.team_member_id = current_team_member_id()
    AND i.status IN ('draft', 'rejected')
  ));

-- Indexes
CREATE INDEX invoices_team_member_idx ON public.invoices(team_member_id);
CREATE INDEX invoices_status_idx ON public.invoices(status);
CREATE INDEX invoice_items_invoice_idx ON public.invoice_items(invoice_id);

-- Auto-update timestamp trigger
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Generate invoice number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_initials TEXT;
  v_year_month TEXT;
  v_count INTEGER;
  v_invoice_number TEXT;
BEGIN
  -- Get team member initials
  SELECT initials INTO v_initials
  FROM team_members
  WHERE id = NEW.team_member_id;
  
  IF v_initials IS NULL THEN
    v_initials := 'XX';
  END IF;
  
  -- Get year-month
  v_year_month := TO_CHAR(CURRENT_DATE, 'YYMM');
  
  -- Count existing invoices for this user this month
  SELECT COUNT(*) + 1 INTO v_count
  FROM invoices
  WHERE team_member_id = NEW.team_member_id
  AND TO_CHAR(created_at, 'YYMM') = v_year_month;
  
  -- Generate: INV-XX-YYMM-001
  v_invoice_number := 'INV-' || v_initials || '-' || v_year_month || '-' || LPAD(v_count::TEXT, 3, '0');
  
  NEW.invoice_number := v_invoice_number;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER generate_invoice_number_trigger
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION public.generate_invoice_number();