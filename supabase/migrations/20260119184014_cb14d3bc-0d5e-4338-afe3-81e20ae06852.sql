-- Update trigger function to use studio_assigned instead of date_assigned
CREATE OR REPLACE FUNCTION generate_work_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pm_initials TEXT;
  date_part TEXT;
  wo_prefix TEXT;
  existing_count INTEGER;
  new_wo TEXT;
  branch_code TEXT;
BEGIN
  -- Skip if branch or PM is null
  IF NEW.branch IS NULL OR NEW.project_manager_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Skip if work_order_number already exists and doesn't start with WO- (legacy format)
  IF NEW.work_order_number IS NOT NULL 
     AND NEW.work_order_number !~ '^WO-' THEN
    RETURN NEW;
  END IF;
  
  -- Get branch code (first letter)
  branch_code := UPPER(SUBSTRING(NEW.branch FROM 1 FOR 1));
  
  -- Get PM initials (first 2 letters of initials column)
  SELECT SUBSTRING(initials FROM 1 FOR 2) INTO pm_initials
  FROM team_members
  WHERE id = NEW.project_manager_id;
  
  IF pm_initials IS NULL THEN
    pm_initials := 'XX';
  END IF;
  
  -- Use studio_assigned for date, fallback to CURRENT_DATE if null
  IF NEW.studio_assigned IS NOT NULL THEN
    date_part := TO_CHAR(NEW.studio_assigned, 'MMDDYY');
  ELSE
    date_part := TO_CHAR(CURRENT_DATE, 'MMDDYY');
  END IF;
  
  -- Build prefix: BranchCode + PM Initials + Date
  wo_prefix := branch_code || pm_initials || date_part;
  
  -- Use advisory lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext(wo_prefix));
  
  -- Count existing WOs with this prefix
  SELECT COUNT(*) INTO existing_count
  FROM tasks
  WHERE work_order_number LIKE wo_prefix || '%';
  
  -- Generate new WO number (padded to 2 digits)
  new_wo := wo_prefix || LPAD((existing_count + 1)::TEXT, 2, '0');
  
  NEW.work_order_number := new_wo;
  
  RETURN NEW;
END;
$$;

-- Update trigger to also fire on studio_assigned changes
DROP TRIGGER IF EXISTS trigger_generate_work_order ON tasks;
CREATE TRIGGER trigger_generate_work_order
  BEFORE INSERT OR UPDATE OF branch, project_manager_id, studio_assigned
  ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION generate_work_order_number();