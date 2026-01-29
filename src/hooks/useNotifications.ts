import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTeamMember } from './useCurrentTeamMember';
import { useEffect } from 'react';

export type NotificationType = 
  | 'mention' 
  | 'assignment' 
  | 'invoice_submitted' 
  | 'invoice_approved' 
  | 'invoice_rejected' 
  | 'invoice_paid';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  task_id: string | null;
  triggered_by_id: string | null;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  triggered_by?: {
    id: string;
    name: string;
    initials: string;
    color: string;
  } | null;
  task?: {
    id: string;
    name: string;
    group?: {
      id: string;
      name: string;
      board?: {
        id: string;
        name: string;
      } | null;
    } | null;
  } | null;
  // For mention notifications - the comment content preview
  comment_preview?: string | null;
  board_name?: string | null;
}

export function useNotifications() {
  const { data: currentMember } = useCurrentTeamMember();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', currentMember?.id],
    queryFn: async () => {
      if (!currentMember?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          triggered_by:team_members!notifications_triggered_by_id_fkey(id, name, initials, color),
          task:tasks!notifications_task_id_fkey(
            id, 
            name,
            group:task_groups!tasks_group_id_fkey(
              id,
              name,
              board:boards!task_groups_board_id_fkey(id, name)
            )
          )
        `)
        .eq('user_id', currentMember.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform to include board_name for easier access
      const transformedData = (data || []).map(notification => ({
        ...notification,
        board_name: notification.task?.group?.board?.name || null,
      }));
      
      return transformedData as Notification[];
    },
    enabled: !!currentMember?.id,
  });

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!currentMember?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentMember.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', currentMember.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentMember?.id, queryClient]);

  return query;
}

export function useUnreadNotificationCount() {
  const { data: notifications } = useNotifications();
  return notifications?.filter((n) => !n.is_read).length ?? 0;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { data: currentMember } = useCurrentTeamMember();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', currentMember?.id] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { data: currentMember } = useCurrentTeamMember();

  return useMutation({
    mutationFn: async () => {
      if (!currentMember?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', currentMember.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', currentMember?.id] });
    },
  });
}

export function useMarkNotificationUnread() {
  const queryClient = useQueryClient();
  const { data: currentMember } = useCurrentTeamMember();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: false, read_at: null })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', currentMember?.id] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { data: currentMember } = useCurrentTeamMember();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', currentMember?.id] });
    },
  });
}
