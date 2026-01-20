-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Team members can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Team members can add conversation participants" ON public.conversation_participants;

-- Allow any authenticated team member (including guests) to create conversations
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE LOWER(email) = LOWER(auth.email())
  )
);

-- Allow any authenticated team member (including guests) to add conversation participants
-- But only if they're a participant in the conversation
CREATE POLICY "Participants can add others to conversations"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE LOWER(email) = LOWER(auth.email())
  )
);