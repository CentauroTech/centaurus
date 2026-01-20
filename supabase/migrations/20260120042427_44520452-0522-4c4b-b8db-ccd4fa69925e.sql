-- Create chat_messages table for real-time team chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow team members to view all messages
CREATE POLICY "Team members can view chat messages"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND role IN ('admin', 'project_manager', 'team_member')
  )
);

-- Allow team members to insert messages
CREATE POLICY "Team members can send chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND role IN ('admin', 'project_manager', 'team_member')
  )
);

-- Create index for efficient queries
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Enable realtime for chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;