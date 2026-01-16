import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Phase progression order (normalized phase names)
const PHASE_ORDER = [
  'kickoff',
  'assets',
  'translation',
  'adapting',
  'voicetests',
  'recording',
  'premix',
  'qcpremix',
  'retakes',
  'qcretakes',
  'mix',
  'qcmix',
  'mixretakes',
  'deliveries',
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

// Map various phase name variations to normalized names
const normalizePhase = (phaseName: string): string => {
  const lower = phaseName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Map common variations
  const variations: Record<string, string> = {
    'kickoff': 'kickoff',
    'assets': 'assets',
    'assetslaunch': 'assets',
    'materiales': 'assets',
    'translation': 'translation',
    'traduccionad': 'translation',
    'traduccinad': 'translation',
    'adapting': 'adapting',
    'adaptacion': 'adapting',
    'voicetests': 'voicetests',
    'recording': 'recording',
    'grabacion': 'recording',
    'premix': 'premix',
    'qcpremix': 'qcpremix',
    'qc1': 'qcpremix',
    'retakes': 'retakes',
    'qcretakes': 'qcretakes',
    'mix': 'mix',
    'mixbogota': 'mix',
    'qcmix': 'qcmix',
    'mixretakes': 'mixretakes',
    'deliveries': 'deliveries',
    'entregados': 'deliveries',
  };
  
  return variations[lower] || lower;
};

// Get next phase based on current phase and task properties
const getNextPhase = (currentPhase: string, pruebaDeVoz: string | null): string | null => {
  const normalized = normalizePhase(currentPhase);
  const currentIndex = PHASE_ORDER.indexOf(normalized);
  
  if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
    return null; // Already at last phase or unknown phase
  }
  
  // Special case: after adapting, skip voicetests if prueba_de_voz is not 'Yes'
  if (normalized === 'adapting' && pruebaDeVoz !== 'Yes') {
    return 'recording';
  }
  
  return PHASE_ORDER[currentIndex + 1];
};

// Extract phase from board name (e.g., "Col-Kickoff" -> "Kickoff")
const extractPhaseFromBoardName = (boardName: string): string => {
  const parts = boardName.split('-');
  return parts.length > 1 ? parts.slice(1).join('-') : boardName;
};

interface MoveToNextPhaseParams {
  taskId: string;
  currentGroupId: string;
  pruebaDeVoz: string | null;
}

export function useMoveToNextPhase(boardId: string, currentUserId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, currentGroupId, pruebaDeVoz }: MoveToNextPhaseParams) => {
      // 1. Get current group to find board
      const { data: currentGroup, error: groupError } = await supabase
        .from('task_groups')
        .select('board_id')
        .eq('id', currentGroupId)
        .single();
      
      if (groupError) throw groupError;

      // 2. Get current board to find workspace and phase
      const { data: currentBoard, error: boardError } = await supabase
        .from('boards')
        .select('workspace_id, name')
        .eq('id', currentGroup.board_id)
        .single();
      
      if (boardError) throw boardError;

      const currentPhase = extractPhaseFromBoardName(currentBoard.name);
      const nextPhase = getNextPhase(currentPhase, pruebaDeVoz);

      if (!nextPhase) {
        // No next phase - task is at final stage
        return { moved: false, message: 'Task is already at the final phase' };
      }

      // 3. Get prefix from current board name (e.g., "Col", "Mia", "Se")
      const prefix = currentBoard.name.split('-')[0];

      // 4. Find the next phase board in the same workspace
      const { data: workspaceBoards, error: wbError } = await supabase
        .from('boards')
        .select('id, name')
        .eq('workspace_id', currentBoard.workspace_id)
        .neq('is_hq', true);

      if (wbError) throw wbError;

      // Find board matching next phase
      const nextBoard = workspaceBoards.find(b => {
        const boardPhase = extractPhaseFromBoardName(b.name);
        return normalizePhase(boardPhase) === nextPhase && b.name.startsWith(prefix);
      });

      if (!nextBoard) {
        return { moved: false, message: `No board found for phase: ${nextPhase}` };
      }

      // 5. Get or create a task group in the target board
      const { data: targetGroups, error: tgError } = await supabase
        .from('task_groups')
        .select('id, name')
        .eq('board_id', nextBoard.id)
        .order('sort_order')
        .limit(1);

      if (tgError) throw tgError;

      let targetGroupId: string;

      if (targetGroups && targetGroups.length > 0) {
        targetGroupId = targetGroups[0].id;
      } else {
        // Create a default group in the target board
        const { data: newGroup, error: ngError } = await supabase
          .from('task_groups')
          .insert({
            board_id: nextBoard.id,
            name: 'Tasks',
            color: 'hsl(209, 100%, 46%)',
          })
          .select()
          .single();

        if (ngError) throw ngError;
        targetGroupId = newGroup.id;
      }

      // 6. Get current task data for activity logging
      const { data: currentTask, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      const nextPhaseName = extractPhaseFromBoardName(nextBoard.name);
      const currentDate = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      // 6.5 Set date_delivered on current task BEFORE moving (stamps delivery from current board)
      await supabase
        .from('tasks')
        .update({ date_delivered: currentDate })
        .eq('id', taskId);

      // Log date_delivered for the current board
      await supabase.from('activity_log').insert({
        task_id: taskId,
        type: 'field_change',
        field: 'date_delivered',
        old_value: currentTask.date_delivered,
        new_value: currentDate,
        user_id: currentUserId || null,
      });

      // 7. Move the task to the new group, update phase, and reset status
      const updateData: Record<string, unknown> = {
        group_id: targetGroupId,
        status: 'default',
        fase: nextPhaseName,
        last_updated: now,
        date_assigned: currentDate, // Set date_assigned for the new board
        date_delivered: null, // Reset date_delivered for the new board
      };

      const { error: updateError } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (updateError) throw updateError;

      // 8. Apply phase automation (assign people based on phase)
      await applyPhaseAutomation(taskId, nextPhase, currentUserId);

      // 9. Log the date_assigned change for new board
      await supabase.from('activity_log').insert({
        task_id: taskId,
        type: 'field_change',
        field: 'date_assigned',
        old_value: currentTask.date_assigned,
        new_value: currentDate,
        user_id: currentUserId || null,
      });

      // 10. Log the phase change in activity_log
      await supabase.from('activity_log').insert({
        task_id: taskId,
        type: 'phase_change',
        field: 'fase',
        old_value: currentTask.fase || currentPhase,
        new_value: nextPhaseName,
        user_id: currentUserId || null,
      });

      // Log the group/board change
      await supabase.from('activity_log').insert({
        task_id: taskId,
        type: 'field_change',
        field: 'board',
        old_value: currentBoard.name,
        new_value: nextBoard.name,
        user_id: currentUserId || null,
      });

      return { 
        moved: true, 
        nextPhase: nextPhaseName,
        nextBoardName: nextBoard.name,
      };
    },
    onSuccess: (result) => {
      if (result.moved) {
        toast.success(`Task moved to ${result.nextPhase}`);
      }
      // Invalidate all board queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
    onError: (error) => {
      console.error('Failed to move task:', error);
      toast.error('Failed to move task to next phase');
    },
  });
}

// Helper to check if we're in Kickoff phase
export const isKickoffPhase = (boardName: string): boolean => {
  const phase = extractPhaseFromBoardName(boardName);
  return normalizePhase(phase) === 'kickoff';
};
