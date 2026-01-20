import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTeamMember } from './useCurrentTeamMember';

export interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    initials: string;
    color: string;
  };
}

export function useChat() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentTeamMember();

  // Fetch recent messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          user_id,
          content,
          created_at,
          user:team_members!chat_messages_user_id_fkey(
            id,
            name,
            initials,
            color
          )
        `)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      return (data || []) as ChatMessage[];
    },
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!currentUser?.id) throw new Error('User not found');
      
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: currentUser.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('chat-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    messages,
    isLoading,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
    currentUserId: currentUser?.id,
  };
}
