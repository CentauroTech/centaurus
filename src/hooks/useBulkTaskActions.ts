import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Phase order for reference
const PHASE_ORDER = [
  'Kickoff',
  'Assets',
  'Translation',
  'Adapting',
  'VoiceTests',
  'Recording',
  'Premix',
  'QC Premix',
  'Retakes',
  'QC Retakes',
  'Mix',
  'QC Mix',
  'MixRetakes',
  'Deliveries',
];

export function useBulkDuplicate(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      // Get all tasks to duplicate
      const { data: tasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .in('id', taskIds);

      if (fetchError) throw fetchError;
      if (!tasks || tasks.length === 0) return { count: 0 };

      // Create copies without id and with new created_at
      const copies = tasks.map((task) => {
        const { id, created_at, ...rest } = task;
        return {
          ...rest,
          name: `${rest.name} (Copy)`,
        };
      });

      const { error: insertError } = await supabase
        .from('tasks')
        .insert(copies);

      if (insertError) throw insertError;

      return { count: copies.length };
    },
    onSuccess: (result) => {
      toast.success(`Duplicated ${result.count} ${result.count === 1 ? 'task' : 'tasks'}`);
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
    onError: (error) => {
      console.error('Failed to duplicate tasks:', error);
      toast.error('Failed to duplicate tasks');
    },
  });
}

export function useBulkDelete(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', taskIds);

      if (error) throw error;

      return { count: taskIds.length };
    },
    onSuccess: (result) => {
      toast.success(`Deleted ${result.count} ${result.count === 1 ? 'task' : 'tasks'}`);
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
    onError: (error) => {
      console.error('Failed to delete tasks:', error);
      toast.error('Failed to delete tasks');
    },
  });
}

export function useBulkMoveToPhase(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskIds, targetPhase }: { taskIds: string[]; targetPhase: string }) => {
      // Get current board info
      const { data: currentBoard, error: boardError } = await supabase
        .from('boards')
        .select('workspace_id, name')
        .eq('id', boardId)
        .single();

      if (boardError) throw boardError;

      // Get prefix from board name
      const prefix = currentBoard.name.split('-')[0];

      // Find target board
      const { data: workspaceBoards, error: wbError } = await supabase
        .from('boards')
        .select('id, name')
        .eq('workspace_id', currentBoard.workspace_id)
        .neq('is_hq', true);

      if (wbError) throw wbError;

      // Normalize phase for matching
      const normalizePhase = (p: string) => p.toLowerCase().replace(/[^a-z0-9]/g, '');
      const targetNormalized = normalizePhase(targetPhase);

      const targetBoard = workspaceBoards.find((b) => {
        const parts = b.name.split('-');
        const boardPhase = parts.length > 1 ? parts.slice(1).join('-') : b.name;
        return normalizePhase(boardPhase) === targetNormalized && b.name.startsWith(prefix);
      });

      if (!targetBoard) {
        throw new Error(`Board not found for phase: ${targetPhase}`);
      }

      // Get or create target group
      const { data: targetGroups, error: tgError } = await supabase
        .from('task_groups')
        .select('id')
        .eq('board_id', targetBoard.id)
        .order('sort_order')
        .limit(1);

      if (tgError) throw tgError;

      let targetGroupId: string;

      if (targetGroups && targetGroups.length > 0) {
        targetGroupId = targetGroups[0].id;
      } else {
        const { data: newGroup, error: ngError } = await supabase
          .from('task_groups')
          .insert({
            board_id: targetBoard.id,
            name: 'Tasks',
            color: 'hsl(209, 100%, 46%)',
          })
          .select()
          .single();

        if (ngError) throw ngError;
        targetGroupId = newGroup.id;
      }

      // Move all tasks
      const currentDate = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      // First, set date_delivered on all tasks before moving (stamps delivery from current board)
      const { error: deliveredError } = await supabase
        .from('tasks')
        .update({ date_delivered: currentDate })
        .in('id', taskIds);

      if (deliveredError) throw deliveredError;

      // Then move to new board with fresh date_assigned and reset date_delivered
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          group_id: targetGroupId,
          status: 'default',
          fase: targetPhase,
          date_assigned: currentDate,
          date_delivered: null, // Reset for the new board
          last_updated: now,
        })
        .in('id', taskIds);

      if (updateError) throw updateError;

      // Log activity for each task
      for (const taskId of taskIds) {
        await supabase.from('activity_log').insert({
          task_id: taskId,
          type: 'phase_change',
          field: 'fase',
          old_value: currentBoard.name,
          new_value: targetPhase,
        });
      }

      return { count: taskIds.length, targetPhase };
    },
    onSuccess: (result) => {
      toast.success(`Moved ${result.count} ${result.count === 1 ? 'task' : 'tasks'} to ${result.targetPhase}`);
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
    onError: (error) => {
      console.error('Failed to move tasks:', error);
      toast.error('Failed to move tasks');
    },
  });
}

export function useMoveTaskToPhase(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, targetPhase }: { taskId: string; targetPhase: string }) => {
      // Get current board info
      const { data: currentBoard, error: boardError } = await supabase
        .from('boards')
        .select('workspace_id, name')
        .eq('id', boardId)
        .single();

      if (boardError) throw boardError;

      // Get prefix from board name
      const prefix = currentBoard.name.split('-')[0];

      // Find target board
      const { data: workspaceBoards, error: wbError } = await supabase
        .from('boards')
        .select('id, name')
        .eq('workspace_id', currentBoard.workspace_id)
        .neq('is_hq', true);

      if (wbError) throw wbError;

      // Normalize phase for matching
      const normalizePhase = (p: string) => p.toLowerCase().replace(/[^a-z0-9]/g, '');
      const targetNormalized = normalizePhase(targetPhase);

      const targetBoard = workspaceBoards.find((b) => {
        const parts = b.name.split('-');
        const boardPhase = parts.length > 1 ? parts.slice(1).join('-') : b.name;
        return normalizePhase(boardPhase) === targetNormalized && b.name.startsWith(prefix);
      });

      if (!targetBoard) {
        throw new Error(`Board not found for phase: ${targetPhase}`);
      }

      // Get or create target group
      const { data: targetGroups, error: tgError } = await supabase
        .from('task_groups')
        .select('id')
        .eq('board_id', targetBoard.id)
        .order('sort_order')
        .limit(1);

      if (tgError) throw tgError;

      let targetGroupId: string;

      if (targetGroups && targetGroups.length > 0) {
        targetGroupId = targetGroups[0].id;
      } else {
        const { data: newGroup, error: ngError } = await supabase
          .from('task_groups')
          .insert({
            board_id: targetBoard.id,
            name: 'Tasks',
            color: 'hsl(209, 100%, 46%)',
          })
          .select()
          .single();

        if (ngError) throw ngError;
        targetGroupId = newGroup.id;
      }

      // Move the task
      const currentDate = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      // First, set date_delivered on current task before moving (stamps delivery from current board)
      await supabase
        .from('tasks')
        .update({ date_delivered: currentDate })
        .eq('id', taskId);

      // Then move to new board with fresh date_assigned and reset date_delivered
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          group_id: targetGroupId,
          status: 'default',
          fase: targetPhase,
          date_assigned: currentDate,
          date_delivered: null, // Reset for the new board
          last_updated: now,
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Log activity
      await supabase.from('activity_log').insert({
        task_id: taskId,
        type: 'phase_change',
        field: 'fase',
        old_value: currentBoard.name,
        new_value: targetPhase,
      });

      return { targetPhase };
    },
    onSuccess: (result) => {
      toast.success(`Moved to ${result.targetPhase}`);
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
    onError: (error) => {
      console.error('Failed to move task:', error);
      toast.error('Failed to move task');
    },
  });
}

export const AVAILABLE_PHASES = PHASE_ORDER;
