import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient, useIsMutating } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribe to real-time updates for a specific board
 * This will automatically refresh the board data when tasks change
 * Uses debouncing and mutation-awareness to prevent race conditions
 */
export function useBoardRealtime(boardId: string | null) {
  const queryClient = useQueryClient();
  const isMutating = useIsMutating({ mutationKey: ['updateTask', boardId] });
  const isMutatingRef = useRef(isMutating);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync
  useEffect(() => {
    isMutatingRef.current = isMutating;
  }, [isMutating]);

  const debouncedInvalidate = useCallback((keys: string[][]) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      // Skip invalidation if a mutation is in-flight to prevent overwriting optimistic updates
      if (isMutatingRef.current > 0) {
        return;
      }
      keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
    }, 300);
  }, [queryClient]);

  useEffect(() => {
    if (!boardId) return;

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
          debouncedInvalidate([['board', boardId], ['workspaces']]);
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
          debouncedInvalidate([['board', boardId]]);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [boardId, debouncedInvalidate]);
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
