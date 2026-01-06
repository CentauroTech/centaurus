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
const getNextPhase = (currentPhase: string, pruebaDeVoz: boolean): string | null => {
  const normalized = normalizePhase(currentPhase);
  const currentIndex = PHASE_ORDER.indexOf(normalized);
  
  if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
    return null; // Already at last phase or unknown phase
  }
  
  // Special case: after adapting, skip voicetests if prueba_de_voz is false
  if (normalized === 'adapting' && !pruebaDeVoz) {
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
  pruebaDeVoz: boolean;
}

export function useMoveToNextPhase(boardId: string) {
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

      // 6. Move the task to the new group and reset status
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          group_id: targetGroupId,
          status: 'default',
          last_updated: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      return { 
        moved: true, 
        nextPhase: extractPhaseFromBoardName(nextBoard.name),
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
