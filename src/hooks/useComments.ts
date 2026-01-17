import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CommentWithUser {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    initials: string;
    color: string;
  } | null;
}

export function useComments(taskId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: async (): Promise<CommentWithUser[]> => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:team_members!comments_user_id_fkey (
            id,
            name,
            initials,
            color
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!taskId && enabled,
    staleTime: 30000, // Cache for 30 seconds
  });
}

export function useAddComment(taskId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, userId, mentionedUserIds = [] }: { content: string; userId: string; mentionedUserIds?: string[] }) => {
      // Insert the comment
      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          task_id: taskId,
          user_id: userId,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert mentions to trigger notifications
      if (mentionedUserIds.length > 0) {
        const mentionInserts = mentionedUserIds.map(mentionedUserId => ({
          comment_id: comment.id,
          mentioned_user_id: mentionedUserId,
        }));

        const { error: mentionError } = await supabase
          .from('comment_mentions')
          .insert(mentionInserts);

        if (mentionError) {
          console.error('Failed to insert mentions:', mentionError);
          // Don't throw - comment was still created successfully
        } else {
          // Manually trigger email notifications for each mention
          // since pg_net isn't available on this project
          for (const mentionedUserId of mentionedUserIds) {
            try {
              // Get task info for the notification
              const { data: task } = await supabase
                .from('tasks')
                .select('id, name')
                .eq('id', taskId)
                .single();

              await supabase.functions.invoke('send-notification-email', {
                body: {
                  notification_id: null, // We don't have the notification ID yet
                  user_id: mentionedUserId,
                  type: 'mention',
                  task_id: taskId,
                  triggered_by_id: userId,
                  title: 'You were mentioned in a comment',
                  message: `"${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`,
                },
              });
            } catch (emailError) {
              console.error('Failed to send notification email:', emailError);
              // Don't throw - comment and mention were still created
            }
          }
        }
      }

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}

export function useDeleteComment(taskId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}
