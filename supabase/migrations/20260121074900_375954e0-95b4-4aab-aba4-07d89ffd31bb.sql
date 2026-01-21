-- Drop the existing policy and recreate with case-insensitive comparison
DROP POLICY IF EXISTS "Users can insert own team_member during signup" ON public.team_members;

CREATE POLICY "Users can insert own team_member during signup"
ON public.team_members
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND LOWER(email) = LOWER(auth.email())
);