import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTeamMember } from './useCurrentTeamMember';

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  otherParticipant?: {
    id: string;
    name: string;
    initials: string;
    color: string;
    role: string;
  };
  lastMessage?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unreadCount: number;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    initials: string;
    color: string;
  };
}

export interface TeamMemberContact {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  email: string | null;
}

// Fetch all team members for contact list
export function useContacts() {
  const { data: currentUser } = useCurrentTeamMember();

  return useQuery({
    queryKey: ['chat-contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, initials, color, role, email')
        .order('name');

      if (error) throw error;
      return (data || []).filter(m => m.id !== currentUser?.id) as TeamMemberContact[];
    },
    enabled: !!currentUser?.id,
  });
}

// Fetch user's conversations with last message and unread count
export function useConversations() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentTeamMember();

  const query = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      if (!currentUser?.id) return [];

      // Get all conversations the user is part of
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('team_member_id', currentUser.id);

      if (partError) throw partError;
      if (!participations?.length) return [];

      const conversationIds = participations.map(p => p.conversation_id);

      // Get conversation details with other participants
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, created_at, updated_at')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;
      if (!conversations?.length) return [];

      // Get all participants for these conversations
      const { data: allParticipants, error: allPartError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          team_member:team_members(id, name, initials, color, role)
        `)
        .in('conversation_id', conversationIds);

      if (allPartError) throw allPartError;

      // Get last message for each conversation
      const conversationsWithDetails: Conversation[] = await Promise.all(
        conversations.map(async (conv) => {
          // Find the other participant
          const otherParticipant = allParticipants?.find(
            p => p.conversation_id === conv.id && (p.team_member as any)?.id !== currentUser.id
          );

          // Get last message
          const { data: lastMessages } = await supabase
            .from('direct_messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          // Get unread count
          const { count } = await supabase
            .from('direct_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', currentUser.id);

          return {
            ...conv,
            otherParticipant: otherParticipant?.team_member as Conversation['otherParticipant'],
            lastMessage: lastMessages?.[0],
            unreadCount: count || 0,
          };
        })
      );

      return conversationsWithDetails;
    },
    enabled: !!currentUser?.id,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, queryClient]);

  return query;
}

// Fetch messages for a specific conversation
export function useDirectMessages(conversationId: string | null) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentTeamMember();

  const query = useQuery({
    queryKey: ['direct-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          is_read,
          created_at,
          sender:team_members!direct_messages_sender_id_fkey(
            id, name, initials, color
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as DirectMessage[];
    },
    enabled: !!conversationId,
  });

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (!conversationId || !currentUser?.id) return;

    const markAsRead = async () => {
      await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUser.id)
        .eq('is_read', false);
    };

    markAsRead();
  }, [conversationId, currentUser?.id, query.data]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['direct-messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
}

// Send a direct message
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentTeamMember();

  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      if (!currentUser?.id) throw new Error('User not found');

      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['direct-messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Start a new conversation with a contact
export function useStartConversation() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentTeamMember();

  return useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!currentUser?.id) throw new Error('User not found');

      const { data, error } = await supabase.rpc('start_conversation', {
        other_member_id: otherUserId,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Get total unread message count
export function useUnreadCount() {
  const { data: currentUser } = useCurrentTeamMember();

  return useQuery({
    queryKey: ['unread-dm-count'],
    queryFn: async () => {
      if (!currentUser?.id) return 0;

      // Get conversations the user is in
      const { data: participations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('team_member_id', currentUser.id);

      if (!participations?.length) return 0;

      const conversationIds = participations.map(p => p.conversation_id);

      const { count } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', currentUser.id);

      return count || 0;
    },
    enabled: !!currentUser?.id,
    refetchInterval: 30000, // Refresh every 30s
  });
}
