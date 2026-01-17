import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTeamMember } from './useCurrentTeamMember';

export interface GuestTask {
  id: string;
  name: string;
  status: string;
  currentPhase: string;
  dateAssigned?: string;
  guestDueDate?: string;
  startedAt?: string;
  completedAt?: string;
  deliveryComment?: string;
  lockedRuntime?: string;
  cantidadEpisodios?: number;
  tituloAprobadoEspanol?: string;
  isPrivate: boolean;
  boardName?: string;
  workspaceName?: string;
}

export function useGuestTasks() {
  const { data: currentMember } = useCurrentTeamMember();

  return useQuery({
    queryKey: ['guest-tasks', currentMember?.id],
    queryFn: async (): Promise<GuestTask[]> => {
      if (!currentMember?.id) return [];

      // Fetch tasks where this user is a viewer or assigned to a role field
      const { data: viewerTasks, error: viewerError } = await supabase
        .from('task_viewers')
        .select('task_id')
        .eq('team_member_id', currentMember.id);

      if (viewerError) throw viewerError;

      const viewerTaskIds = viewerTasks?.map(t => t.task_id) || [];

      if (viewerTaskIds.length === 0) return [];

      // Fetch the actual tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          status,
          date_assigned,
          guest_due_date,
          started_at,
          completed_at,
          delivery_comment,
          locked_runtime,
          cantidad_episodios,
          titulo_aprobado_espanol,
          is_private,
          group_id
        `)
        .in('id', viewerTaskIds);

      if (tasksError) throw tasksError;

      // Fetch group and board info for each task
      const groupIds = [...new Set(tasks?.map(t => t.group_id) || [])];
      
      const { data: groups, error: groupsError } = await supabase
        .from('task_groups')
        .select('id, board_id')
        .in('id', groupIds);

      if (groupsError) throw groupsError;

      const boardIds = [...new Set(groups?.map(g => g.board_id) || [])];

      const { data: boards, error: boardsError } = await supabase
        .from('boards')
        .select('id, name, workspace_id')
        .in('id', boardIds);

      if (boardsError) throw boardsError;

      const workspaceIds = [...new Set(boards?.map(b => b.workspace_id) || [])];

      const { data: workspaces, error: wsError } = await supabase
        .from('workspaces')
        .select('id, name')
        .in('id', workspaceIds);

      if (wsError) throw wsError;

      // Create lookup maps
      const groupToBoard = new Map(groups?.map(g => [g.id, g.board_id]) || []);
      const boardMap = new Map(boards?.map(b => [b.id, b]) || []);
      const workspaceMap = new Map(workspaces?.map(w => [w.id, w.name]) || []);

      // Map tasks with board/workspace info
      return (tasks || []).map(task => {
        const boardId = groupToBoard.get(task.group_id);
        const board = boardId ? boardMap.get(boardId) : null;
        const workspaceName = board ? workspaceMap.get(board.workspace_id) : '';
        
        // Extract phase from board name (e.g., "Mia-Recording" -> "Recording")
        const boardName = board?.name || '';
        const parts = boardName.split('-');
        const currentPhase = parts.length > 1 ? parts.slice(1).join('-') : boardName;

        return {
          id: task.id,
          name: task.name,
          status: task.status,
          currentPhase,
          dateAssigned: task.date_assigned,
          guestDueDate: task.guest_due_date,
          startedAt: task.started_at,
          completedAt: task.completed_at,
          deliveryComment: task.delivery_comment,
          lockedRuntime: task.locked_runtime,
          cantidadEpisodios: task.cantidad_episodios,
          tituloAprobadoEspanol: task.titulo_aprobado_espanol,
          isPrivate: task.is_private,
          boardName,
          workspaceName: workspaceName || '',
        };
      });
    },
    enabled: !!currentMember?.id,
  });
}

export function useUpdateGuestTask() {
  const queryClient = useQueryClient();
  const { data: currentMember } = useCurrentTeamMember();

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      updates 
    }: { 
      taskId: string; 
      updates: Record<string, any>;
    }) => {
      // Fetch current task to check status
      const { data: currentTask, error: fetchError } = await supabase
        .from('tasks')
        .select('status')
        .eq('id', taskId)
        .single();

      if (fetchError) throw fetchError;

      // Block status change FROM "Done" (only admins can revert)
      if (currentTask.status === 'done' && updates.status && updates.status !== 'done') {
        throw new Error('Cannot change status after task is marked as Done. Contact admin to revert.');
      }

      // If changing to "Working on It" and not started, set started_at
      if (updates.status === 'working' && !currentTask.status?.includes('working')) {
        const { data: taskWithTiming } = await supabase
          .from('tasks')
          .select('started_at')
          .eq('id', taskId)
          .single();

        if (!taskWithTiming?.started_at) {
          updates.started_at = new Date().toISOString();
        }
      }

      // If changing to "Done", set completed_at
      if (updates.status === 'done') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('tasks')
        .update({ ...updates, last_updated: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-tasks'] });
    },
  });
}

export function useCompleteGuestTask() {
  const queryClient = useQueryClient();
  const { data: currentMember } = useCurrentTeamMember();

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      deliveryComment 
    }: { 
      taskId: string; 
      deliveryComment?: string;
    }) => {
      if (!currentMember?.id) throw new Error('User not authenticated');

      // Update task to done
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: 'done',
          completed_at: new Date().toISOString(),
          delivery_comment: deliveryComment || null,
          last_updated: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Remove viewer assignment (unassign guest)
      const { error: viewerError } = await supabase
        .from('task_viewers')
        .delete()
        .eq('task_id', taskId)
        .eq('team_member_id', currentMember.id);

      if (viewerError) throw viewerError;

      // Make task public again
      const { data, error: publicError } = await supabase
        .from('tasks')
        .update({ is_private: false })
        .eq('id', taskId)
        .select()
        .single();

      if (publicError) throw publicError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['board'] });
    },
  });
}
