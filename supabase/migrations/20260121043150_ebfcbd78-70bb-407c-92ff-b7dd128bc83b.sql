-- Drop the existing check constraint on role_type
ALTER TABLE public.team_member_roles DROP CONSTRAINT IF EXISTS team_member_roles_role_type_check;

-- Add updated check constraint that includes 'billing'
ALTER TABLE public.team_member_roles ADD CONSTRAINT team_member_roles_role_type_check 
CHECK (role_type IN ('translator', 'adapter', 'premix', 'mixer', 'qc_premix', 'qc_retakes', 'qc_mix', 'director', 'tecnico', 'billing'));