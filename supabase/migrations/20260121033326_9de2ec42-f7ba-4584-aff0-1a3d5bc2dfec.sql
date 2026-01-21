-- Create billing_profiles table
CREATE TABLE public.billing_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL UNIQUE REFERENCES public.team_members(id) ON DELETE CASCADE,
  
  -- Personal Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  artistic_name TEXT,
  email TEXT NOT NULL,
  phone_number TEXT,
  
  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  
  -- Tax & Banking
  tax_id TEXT,
  preferred_currency TEXT DEFAULT 'USD',
  bank_name TEXT,
  bank_account_number TEXT,
  bank_routing_number TEXT,
  bank_account_holder TEXT,
  paypal_email TEXT,
  
  -- Business Fields
  is_business BOOLEAN DEFAULT false,
  business_name TEXT,
  business_email TEXT,
  business_address TEXT,
  business_city TEXT,
  business_state TEXT,
  business_postal_code TEXT,
  business_country TEXT,
  business_id TEXT,
  business_phone TEXT,
  
  -- Lock Status
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billing_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own billing profile"
ON public.billing_profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_team_member() 
  AND team_member_id = current_team_member_id()
);

-- Users can insert their own profile
CREATE POLICY "Users can insert own billing profile"
ON public.billing_profiles
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND is_team_member() 
  AND team_member_id = current_team_member_id()
);

-- Users can update their own profile only if not locked
CREATE POLICY "Users can update own unlocked billing profile"
ON public.billing_profiles
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND is_team_member() 
  AND team_member_id = current_team_member_id()
  AND is_locked = false
);

-- Project managers can view all profiles
CREATE POLICY "PMs can view all billing profiles"
ON public.billing_profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_project_manager()
);

-- Project managers can update any profile (for unlocking)
CREATE POLICY "PMs can update any billing profile"
ON public.billing_profiles
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND is_project_manager()
);

-- Create updated_at trigger
CREATE TRIGGER update_billing_profiles_updated_at
BEFORE UPDATE ON public.billing_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to lock billing profile on first invoice submit
CREATE OR REPLACE FUNCTION public.lock_billing_profile_on_invoice_submit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only lock when status changes to 'submitted' from 'draft'
  IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN
    UPDATE public.billing_profiles
    SET is_locked = true, locked_at = now()
    WHERE team_member_id = NEW.team_member_id
    AND is_locked = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on invoices table
CREATE TRIGGER lock_profile_on_invoice_submit
AFTER UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.lock_billing_profile_on_invoice_submit();