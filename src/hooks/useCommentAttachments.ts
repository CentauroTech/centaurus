import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CommentAttachment {
  id: string;
  comment_id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  created_at: string;
}

export function useCommentAttachments(taskId: string) {
  return useQuery({
    queryKey: ['comment-attachments', taskId],
    queryFn: async (): Promise<CommentAttachment[]> => {
      const { data: comments } = await supabase
        .from('comments')
        .select('id')
        .eq('task_id', taskId);

      if (!comments || comments.length === 0) return [];

      const commentIds = comments.map(c => c.id);
      const { data, error } = await supabase
        .from('comment_attachments')
        .select('*')
        .in('comment_id', commentIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!taskId,
    staleTime: 30000,
  });
}

export function useAddCommentAttachment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, file }: { commentId: string; file: File }) => {
      // Upload file to storage
      const filePath = `comments/${commentId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('production-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Insert attachment record
      const { error } = await supabase
        .from('comment_attachments')
        .insert({
          comment_id: commentId,
          name: file.name,
          url: filePath,
          size: file.size,
          type: file.type || 'application/octet-stream',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comment-attachments', taskId] });
    },
  });
}
