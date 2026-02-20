ALTER TABLE public.team_member_roles DROP CONSTRAINT team_member_roles_role_type_check;

ALTER TABLE public.team_member_roles ADD CONSTRAINT team_member_roles_role_type_check 
CHECK (role_type = ANY (ARRAY['translator','adapter','premix','mixer','qc_premix','qc_retakes','qc_mix','director','tecnico','billing','payment','project_manager']));