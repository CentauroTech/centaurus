import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTaskViewers(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-viewers', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const { data, error } = await supabase
        .from('task_viewers')
        .select('team_member_id')
        .eq('task_id', taskId);
      
      if (error) throw error;
      return data.map(v => v.team_member_id);
    },
    enabled: !!taskId,
  });
}

export function useUpdateTaskViewers(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, viewerIds }: { taskId: string; viewerIds: string[] }) => {
      // Delete existing viewers
      const { error: deleteError } = await supabase
        .from('task_viewers')
        .delete()
        .eq('task_id', taskId);
      
      if (deleteError) throw deleteError;

      // Insert new viewers
      if (viewerIds.length > 0) {
        const { error: insertError } = await supabase
          .from('task_viewers')
          .insert(viewerIds.map(id => ({ task_id: taskId, team_member_id: id })));
        
        if (insertError) throw insertError;
      }

      return { taskId, viewerIds };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['task-viewers', result.taskId] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}
