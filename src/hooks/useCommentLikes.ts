import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTeamMember } from './useCurrentTeamMember';

export interface CommentLike {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
}

export function useCommentLikes(taskId: string) {
  return useQuery({
    queryKey: ['comment-likes', taskId],
    queryFn: async (): Promise<CommentLike[]> => {
      const { data: comments } = await supabase
        .from('comments')
        .select('id')
        .eq('task_id', taskId);

      if (!comments || comments.length === 0) return [];

      const commentIds = comments.map(c => c.id);
      const { data: likes, error: likesError } = await supabase
        .from('comment_likes')
        .select('*')
        .in('comment_id', commentIds);

      if (likesError) throw likesError;
      return likes || [];
    },
    enabled: !!taskId,
    staleTime: 10000,
  });
}

export function useToggleCommentLike(taskId: string) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentTeamMember();

  return useMutation({
    mutationFn: async ({ commentId, isLiked }: { commentId: string; isLiked: boolean }) => {
      if (!currentUser?.id) throw new Error('Not authenticated');

      if (isLiked) {
        // Remove like
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', currentUser.id);
        if (error) throw error;
      } else {
        // Add like
        const { error } = await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: currentUser.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comment-likes', taskId] });
    },
  });
}
