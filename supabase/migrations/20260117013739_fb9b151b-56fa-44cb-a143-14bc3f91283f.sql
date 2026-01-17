-- Create trigger function for automatic WO generation (fixed locking approach)
CREATE OR REPLACE FUNCTION generate_work_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  branch_code TEXT;
  pm_initials TEXT;
  date_str TEXT;
  wo_prefix TEXT;
  existing_count INTEGER;
  new_wo TEXT;
  lock_key BIGINT;
BEGIN
  -- Only generate if both branch and project_manager_id are set
  IF NEW.branch IS NULL OR NEW.project_manager_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Skip if work_order_number already exists and doesn't start with WO- (legacy format)
  IF NEW.work_order_number IS NOT NULL 
     AND NEW.work_order_number !~ '^WO-' THEN
    RETURN NEW;
  END IF;
  
  -- Map branch to code
  branch_code := CASE NEW.branch
    WHEN 'Miami' THEN 'M'
    WHEN 'Colombia' THEN 'C'
    WHEN 'Brazil' THEN 'B'
    WHEN 'Mexico' THEN 'MX'
    ELSE 'X'
  END;
  
  -- Get PM initials from team_members
  SELECT initials INTO pm_initials
  FROM team_members
  WHERE id = NEW.project_manager_id;
  
  IF pm_initials IS NULL THEN
    pm_initials := 'XX';
  END IF;
  
  -- Format date as MMDDYY
  date_str := TO_CHAR(CURRENT_DATE, 'MMDDYY');
  
  -- Build prefix
  wo_prefix := branch_code || pm_initials || date_str;
  
  -- Use advisory lock for atomicity (hash the prefix for a unique lock key)
  lock_key := hashtext(wo_prefix);
  PERFORM pg_advisory_xact_lock(lock_key);
  
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

-- Create trigger on INSERT and UPDATE of branch/project_manager_id
DROP TRIGGER IF EXISTS trigger_generate_work_order ON tasks;
CREATE TRIGGER trigger_generate_work_order
  BEFORE INSERT OR UPDATE OF branch, project_manager_id
  ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION generate_work_order_number();

-- Update existing NULL values with defaults before adding constraints
UPDATE tasks 
SET branch = 'Miami' 
WHERE branch IS NULL;

UPDATE tasks 
SET project_manager_id = (
  SELECT id FROM team_members 
  WHERE role = 'project_manager' 
  LIMIT 1
)
WHERE project_manager_id IS NULL;

-- Add NOT NULL constraints
ALTER TABLE tasks 
  ALTER COLUMN branch SET NOT NULL,
  ALTER COLUMN project_manager_id SET NOT NULL;