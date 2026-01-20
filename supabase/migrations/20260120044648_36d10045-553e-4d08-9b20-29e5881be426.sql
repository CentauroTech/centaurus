-- Drop existing INSERT policies and recreate without role restriction
DROP POLICY IF EXISTS "Authenticated can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated can add participants" ON public.conversation_participants;

-- Create INSERT policy for conversations - apply to PUBLIC (all roles)
CREATE POLICY "Anyone can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (true);

-- Create INSERT policy for participants - apply to PUBLIC (all roles)
CREATE POLICY "Anyone can add participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (true);