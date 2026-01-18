-- Update is_project_manager function to include god and admin roles
CREATE OR REPLACE FUNCTION public.is_project_manager()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE email = auth.email() 
    AND role IN ('project_manager', 'admin', 'god')
  );
$function$;