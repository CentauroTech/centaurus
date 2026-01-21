-- Fix the invoice UPDATE policy that's causing RLS violations
-- The USING clause checks the OLD row, WITH CHECK validates the NEW row

DROP POLICY IF EXISTS "Users can update own draft invoices" ON invoices;

CREATE POLICY "Users can update own draft invoices" ON invoices
FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_team_member() 
  AND team_member_id = current_team_member_id()
  AND status IN ('draft', 'rejected')
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND is_team_member() 
  AND team_member_id = current_team_member_id()
);

-- Allow billing role members to view all invoices
CREATE POLICY "Billing role can view all invoices" ON invoices
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM team_member_roles tmr
    JOIN team_members tm ON tmr.team_member_id = tm.id
    WHERE tm.email = auth.email()
    AND tmr.role_type = 'billing'
  )
);

-- Allow billing role members to update invoice status (approve/reject/mark paid)
CREATE POLICY "Billing role can update invoices" ON invoices
FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM team_member_roles tmr
    JOIN team_members tm ON tmr.team_member_id = tm.id
    WHERE tm.email = auth.email()
    AND tmr.role_type = 'billing'
  )
);

-- Create trigger function to notify billing team on invoice submission
CREATE OR REPLACE FUNCTION notify_billing_on_invoice_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing_member RECORD;
  v_submitter_name TEXT;
  v_invoice_number TEXT;
BEGIN
  -- Only trigger when status changes to 'submitted'
  IF NEW.status = 'submitted' AND (OLD.status = 'draft' OR OLD.status = 'rejected') THEN
    -- Get submitter name
    SELECT name INTO v_submitter_name 
    FROM team_members WHERE id = NEW.team_member_id;
    
    v_invoice_number := NEW.invoice_number;
    
    -- Notify all team members with billing role
    FOR v_billing_member IN 
      SELECT DISTINCT tm.id, tm.name, tm.email
      FROM team_members tm
      JOIN team_member_roles tmr ON tm.id = tmr.team_member_id
      WHERE tmr.role_type = 'billing'
    LOOP
      -- Create in-app notification
      INSERT INTO notifications (user_id, type, task_id, triggered_by_id, title, message)
      VALUES (
        v_billing_member.id,
        'invoice_submitted',
        NULL,
        NEW.team_member_id,
        'Invoice Submitted for Approval',
        v_submitter_name || ' submitted invoice ' || v_invoice_number || ' ($' || ROUND(NEW.total_amount::numeric, 2) || ')'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_billing_on_invoice_submit ON invoices;
CREATE TRIGGER trigger_notify_billing_on_invoice_submit
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION notify_billing_on_invoice_submit();