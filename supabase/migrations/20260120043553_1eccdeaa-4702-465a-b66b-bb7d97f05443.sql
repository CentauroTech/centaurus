-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can add others to conversations" ON public.conversation_participants;

-- Create a simpler policy that allows any authenticated user with a team_member record to create conversations
CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE LOWER(email) = LOWER(auth.email())
  )
);

-- Allow users to add participants when they have a team_member record
CREATE POLICY "Users can add conversation participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE LOWER(email) = LOWER(auth.email())
  )
);