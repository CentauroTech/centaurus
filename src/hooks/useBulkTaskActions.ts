import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User } from '@/types/board';

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

// Phase automation configuration - maps normalized phase names to team member names
const PHASE_AUTOMATIONS: Record<string, string[]> = {
  'assets': ['Natalia Aparicio'],
  'translation': ['Julio Neri'],
  'adapting': ['Julio Neri'],
  'voicetests': ['Julio Neri', 'Judith Noguera'],
  'recording': ['Judith Noguera'],
  'premix': ['Judith Noguera'],
  'qcpremix': ['Natalia Aparicio'],
  'retakes': ['Judith Noguera'],
  'qcretakes': ['Natalia Aparicio'],
  'mix': ['Natalia Aparicio'],
  'mixretakes': ['Natalia Aparicio'],
  'deliveries': ['Natalia Aparicio'],
};

// Helper function to assign people to a task based on phase automation
async function applyPhaseAutomation(
  taskId: string,
  normalizedPhase: string,
  currentUserId: string | null | undefined
): Promise<void> {
  const assignees = PHASE_AUTOMATIONS[normalizedPhase];
  if (!assignees || assignees.length === 0) return;

  // Fetch team members for the assignees
  const { data: teamMembers, error: teamError } = await supabase
    .from('team_members')
    .select('id, name')
    .in('name', assignees);

  if (teamError || !teamMembers || teamMembers.length === 0) {
    console.error('Failed to fetch team members for automation:', teamError);
    return;
  }

  // Get existing assignments to avoid duplicates
  const { data: existingAssignments } = await supabase
    .from('task_people')
    .select('team_member_id')
    .eq('task_id', taskId);

  const existingIds = new Set(existingAssignments?.map(a => a.team_member_id) || []);

  // Filter out already assigned members
  const newAssignments = teamMembers.filter(tm => !existingIds.has(tm.id));

  if (newAssignments.length === 0) return;

  // Insert new assignments
  const insertData = newAssignments.map(tm => ({
    task_id: taskId,
    team_member_id: tm.id
  }));

  const { error: insertError } = await supabase
    .from('task_people')
    .insert(insertData);

  if (insertError) {
    console.error('Failed to insert task_people:', insertError);
    return;
  }

  // Log the assignment
  const assignedNames = newAssignments.map(tm => tm.name).join(', ');
  await supabase.from('activity_log').insert({
    task_id: taskId,
    type: 'field_change',
    field: 'people',
    old_value: null,
    new_value: assignedNames,
    user_id: currentUserId || null,
  });
}

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

export function useBulkMoveToPhase(boardId: string, currentUserId?: string | null) {
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

      // Apply phase automation (assign people based on phase)
      const normalizedPhase = normalizePhase(targetPhase);
      for (const taskId of taskIds) {
        await applyPhaseAutomation(taskId, normalizedPhase, currentUserId);
      }

      // Log activity for each task with user attribution
      for (const taskId of taskIds) {
        await supabase.from('activity_log').insert({
          task_id: taskId,
          type: 'phase_change',
          field: 'fase',
          old_value: currentBoard.name,
          new_value: targetPhase,
          user_id: currentUserId || null,
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

export function useMoveTaskToPhase(boardId: string, currentUserId?: string | null) {
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

      // Apply phase automation (assign people based on phase)
      const normalizedPhase = normalizePhase(targetPhase);
      await applyPhaseAutomation(taskId, normalizedPhase, currentUserId);

      // Log activity with user attribution
      await supabase.from('activity_log').insert({
        task_id: taskId,
        type: 'phase_change',
        field: 'fase',
        old_value: currentBoard.name,
        new_value: targetPhase,
        user_id: currentUserId || null,
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

// Bulk update field for multiple tasks
export function useBulkUpdateField(boardId: string, currentUserId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      taskIds, 
      field, 
      value,
      displayField,
      oldValues,
    }: { 
      taskIds: string[]; 
      field: string; 
      value: any;
      displayField?: string;
      oldValues?: Map<string, any>;
    }) => {
      // Handle people field separately (junction table)
      if (field === 'people') {
        const people = value as User[];
        
        for (const taskId of taskIds) {
          // Delete existing people for this task
          await supabase.from('task_people').delete().eq('task_id', taskId);
          
          // Insert new people
          if (people.length > 0) {
            await supabase.from('task_people').insert(
              people.map(p => ({ task_id: taskId, team_member_id: p.id }))
            );
          }
        }
        
        // Log activity
        const newNames = people.map(p => p.name).join(', ') || null;
        for (const taskId of taskIds) {
          await supabase.from('activity_log').insert({
            task_id: taskId,
            type: 'field_change',
            field: displayField || field,
            old_value: null,
            new_value: newNames,
            user_id: currentUserId || null,
          });
        }
        
        return { count: taskIds.length, field };
      }

      // Update regular fields
      const updates: Record<string, any> = { [field]: value };
      
      // Auto-set date_delivered when status is 'done'
      if (field === 'status' && value === 'done') {
        updates.date_delivered = new Date().toISOString().split('T')[0];
      }
      
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .in('id', taskIds);

      if (error) throw error;

      // Log activity for each task
      const displayValue = typeof value === 'object' && value?.name 
        ? value.name 
        : typeof value === 'object' && value?.id 
          ? value.id 
          : String(value ?? '');

      for (const taskId of taskIds) {
        await supabase.from('activity_log').insert({
          task_id: taskId,
          type: 'field_change',
          field: displayField || field,
          old_value: oldValues?.get(taskId) ?? null,
          new_value: displayValue,
          user_id: currentUserId || null,
        });
      }

      return { count: taskIds.length, field };
    },
    onSuccess: (result) => {
      toast.success(`Updated ${result.field} for ${result.count} ${result.count === 1 ? 'task' : 'tasks'}`);
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['activity-log'] });
    },
    onError: (error) => {
      console.error('Failed to bulk update:', error);
      toast.error('Failed to update tasks');
    },
  });
}
