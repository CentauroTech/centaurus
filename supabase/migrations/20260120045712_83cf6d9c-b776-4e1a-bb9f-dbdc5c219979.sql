-- Completely reset RLS for conversations table
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

-- Re-enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create a very simple INSERT policy that allows any authenticated or anon user
CREATE POLICY "Allow all inserts on conversations"
ON public.conversations 
FOR INSERT
TO public
WITH CHECK (true);

-- Create SELECT policy using the helper function
CREATE POLICY "Allow view own conversations"
ON public.conversations 
FOR SELECT
TO public
USING (is_conversation_participant(id));

-- Create UPDATE policy for conversation updates
CREATE POLICY "Allow update own conversations"
ON public.conversations 
FOR UPDATE
TO public
USING (is_conversation_participant(id))
WITH CHECK (is_conversation_participant(id));