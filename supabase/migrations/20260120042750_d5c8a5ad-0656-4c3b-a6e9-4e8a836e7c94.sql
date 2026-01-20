-- Drop the general chat table
DROP TABLE IF EXISTS public.chat_messages;

-- Create conversations table for 1-to-1 messaging
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation participants (exactly 2 per conversation for DMs)
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, team_member_id)
);

-- Create direct messages table
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Function to check if user is participant in conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants cp
    JOIN team_members tm ON cp.team_member_id = tm.id
    WHERE cp.conversation_id = conv_id
    AND LOWER(tm.email) = LOWER(auth.email())
  );
$$;

-- Conversations: users can see conversations they're part of
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (public.is_conversation_participant(id));

-- Conversation participants: users can see participants of their conversations
CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants FOR SELECT
USING (public.is_conversation_participant(conversation_id));

-- Direct messages: users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
ON public.direct_messages FOR SELECT
USING (public.is_conversation_participant(conversation_id));

-- Direct messages: users can send messages in their conversations
CREATE POLICY "Users can send messages in their conversations"
ON public.direct_messages FOR INSERT
WITH CHECK (
  public.is_conversation_participant(conversation_id)
  AND sender_id = public.current_team_member_id()
);

-- Direct messages: users can update read status
CREATE POLICY "Users can update message read status"
ON public.direct_messages FOR UPDATE
USING (public.is_conversation_participant(conversation_id))
WITH CHECK (public.is_conversation_participant(conversation_id));

-- Allow team members to create conversations
CREATE POLICY "Team members can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (public.is_team_member());

-- Allow adding participants to conversations (by team members)
CREATE POLICY "Team members can add conversation participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (public.is_team_member());

-- Indexes for performance
CREATE INDEX idx_conversation_participants_member ON public.conversation_participants(team_member_id);
CREATE INDEX idx_conversation_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX idx_direct_messages_conversation ON public.direct_messages(conversation_id, created_at DESC);
CREATE INDEX idx_direct_messages_unread ON public.direct_messages(conversation_id, is_read) WHERE is_read = false;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;