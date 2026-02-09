
-- Drop existing restrictive policies on conversations
DROP POLICY IF EXISTS "Allow all inserts on conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow update own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow view own conversations" ON public.conversations;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Allow all inserts on conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow view own conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (is_conversation_participant(id));

CREATE POLICY "Allow update own conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (is_conversation_participant(id))
WITH CHECK (is_conversation_participant(id));

-- Also fix conversation_participants policies
DROP POLICY IF EXISTS "Anyone can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;

CREATE POLICY "Anyone can add participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (is_conversation_participant(conversation_id));

-- Also fix direct_messages policies
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can update message read status" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.direct_messages;

CREATE POLICY "Users can send messages in their conversations"
ON public.direct_messages
FOR INSERT
TO authenticated
WITH CHECK (is_conversation_participant(conversation_id) AND sender_id = current_team_member_id());

CREATE POLICY "Users can update message read status"
ON public.direct_messages
FOR UPDATE
TO authenticated
USING (is_conversation_participant(conversation_id))
WITH CHECK (is_conversation_participant(conversation_id));

CREATE POLICY "Users can view messages in their conversations"
ON public.direct_messages
FOR SELECT
TO authenticated
USING (is_conversation_participant(conversation_id));
