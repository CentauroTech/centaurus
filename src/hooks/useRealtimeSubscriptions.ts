import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribe to real-time updates for a specific board
 * This will automatically refresh the board data when tasks change
 */
export function useBoardRealtime(boardId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!boardId) return;

    // Subscribe to task changes for this board's tasks
    const channel = supabase
      .channel(`board-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('Task change detected:', payload.eventType);
          // Invalidate the board query to refresh data
          queryClient.invalidateQueries({ queryKey: ['board', boardId] });
          queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_groups',
        },
        (payload) => {
          console.log('Task group change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['board', boardId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, queryClient]);
}

/**
 * Subscribe to real-time updates for comments on a specific task
 */
export function useCommentsRealtime(taskId: string | null, enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!taskId || !enabled) return;

    const channel = supabase
      .channel(`comments-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          console.log('Comment change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, enabled, queryClient]);
}

/**
 * Subscribe to real-time updates for notifications
 */
export function useNotificationsRealtime(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New notification received:', payload);
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Notification updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

/**
 * Subscribe to real-time updates for guest tasks
 */
export function useGuestTasksRealtime(enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('guest-tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('Guest task change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['guest-tasks'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_viewers',
        },
        (payload) => {
          console.log('Task viewer change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['guest-tasks'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}
