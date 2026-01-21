-- Allow authenticated users to insert their own team_member record during signup
-- This is needed because the user signs up via Supabase Auth first, then creates their team_member record
CREATE POLICY "Users can insert own team_member during signup"
ON public.team_members
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND email = auth.email()
);