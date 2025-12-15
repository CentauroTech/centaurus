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
    mutationFn: async ({ content, userId }: { content: string; userId: string }) => {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          task_id: taskId,
          user_id: userId,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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
