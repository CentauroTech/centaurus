import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTeamMember } from './useCurrentTeamMember';

export interface GuestAssignedPerson {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface GuestTask {
  id: string;
  name: string;
  status: string;
  currentPhase: string;
  fase: string;
  dateAssigned?: string;
  guestDueDate?: string;
  startedAt?: string;
  completedAt?: string;
  lastUpdated?: string;
  deliveryComment?: string;
  lockedRuntime?: string;
  finalRuntime?: string;
  cantidadEpisodios?: number;
  tituloAprobadoEspanol?: string;
  lenguajeOriginal?: string;
  workOrderNumber?: string;
  isPrivate: boolean;
  boardName?: string;
  workspaceName?: string;
  commentCount?: number;
  // Role assignments
  translator?: GuestAssignedPerson;
  adapter?: GuestAssignedPerson;
}

export function useGuestTasks() {
  const { data: currentMember } = useCurrentTeamMember();

  return useQuery({
    queryKey: ['guest-tasks', currentMember?.id],
    queryFn: async (): Promise<GuestTask[]> => {
      if (!currentMember?.id) return [];

      // Fetch tasks where this user is a viewer
      const { data: viewerTasks, error: viewerError } = await supabase
        .from('task_viewers')
        .select('task_id')
        .eq('team_member_id', currentMember.id);

      if (viewerError) throw viewerError;

      const viewerTaskIds = viewerTasks?.map(t => t.task_id) || [];

      if (viewerTaskIds.length === 0) return [];

      // Fetch the actual tasks with all needed columns
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          status,
          fase,
          date_assigned,
          guest_due_date,
          started_at,
          completed_at,
          last_updated,
          delivery_comment,
          locked_runtime,
          final_runtime,
          cantidad_episodios,
          titulo_aprobado_espanol,
          lenguaje_original,
          work_order_number,
          is_private,
          group_id,
          traductor_id,
          adaptador_id
        `)
        .in('id', viewerTaskIds);

      // Fetch comment counts for guest-visible comments
      const { data: commentCounts } = await supabase
        .from('comments')
        .select('task_id')
        .in('task_id', viewerTaskIds)
        .eq('is_guest_visible', true);

      // Create comment count map
      const commentCountMap = new Map<string, number>();
      commentCounts?.forEach(c => {
        commentCountMap.set(c.task_id, (commentCountMap.get(c.task_id) || 0) + 1);
      });

      if (tasksError) throw tasksError;

      // Get all team member IDs we need to look up
      const memberIds = new Set<string>();
      tasks?.forEach(t => {
        if (t.traductor_id) memberIds.add(t.traductor_id);
        if (t.adaptador_id) memberIds.add(t.adaptador_id);
      });

      // Fetch team members
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('id, name, initials, color')
        .in('id', Array.from(memberIds));

      const memberMap = new Map(teamMembers?.map(m => [m.id, m]) || []);

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
          fase: task.fase || 'pre_production',
          currentPhase,
          dateAssigned: task.date_assigned,
          guestDueDate: task.guest_due_date,
          startedAt: task.started_at,
          completedAt: task.completed_at,
          lastUpdated: task.last_updated,
          deliveryComment: task.delivery_comment,
          lockedRuntime: task.locked_runtime,
          finalRuntime: task.final_runtime,
          cantidadEpisodios: task.cantidad_episodios,
          tituloAprobadoEspanol: task.titulo_aprobado_espanol,
          lenguajeOriginal: task.lenguaje_original,
          workOrderNumber: task.work_order_number,
          isPrivate: task.is_private,
          boardName,
          workspaceName: workspaceName || '',
          commentCount: commentCountMap.get(task.id) || 0,
          translator: task.traductor_id ? memberMap.get(task.traductor_id) : undefined,
          adapter: task.adaptador_id ? memberMap.get(task.adaptador_id) : undefined,
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

      // Get task details for phase progression
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('group_id, prueba_de_voz, fase')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      const currentDate = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      // Update task to done - keep private status and viewer assignment
      // so task remains visible to guest in "Completed" tab
      const { data, error: updateError } = await supabase
        .from('tasks')
        .update({
          status: 'done',
          completed_at: now,
          date_delivered: currentDate,
          delivery_comment: deliveryComment || null,
          last_updated: now,
        })
        .eq('id', taskId)
        .select();

      if (updateError) throw updateError;

      // Log activity
      await supabase.from('activity_log').insert({
        task_id: taskId,
        type: 'field_change',
        field: 'status',
        old_value: null,
        new_value: 'done',
        user_id: currentMember.id,
      });

      // Trigger phase progression - move task to next board
      await triggerPhaseProgression(
        taskId,
        taskData.group_id,
        taskData.prueba_de_voz,
        currentMember.id
      );

      return data?.[0] || null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

// Helper function to trigger phase progression from guest completion
async function triggerPhaseProgression(
  taskId: string,
  currentGroupId: string,
  pruebaDeVoz: string | null,
  userId: string
): Promise<void> {
  // Phase progression order (normalized phase names)
  const PHASE_ORDER = [
    'kickoff', 'assets', 'translation', 'adapting', 'voicetests',
    'recording', 'premix', 'qcpremix', 'retakes', 'qcretakes',
    'mix', 'qcmix', 'mixretakes', 'deliveries',
  ];

  const normalizePhase = (phaseName: string): string => {
    const lower = phaseName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const variations: Record<string, string> = {
      'kickoff': 'kickoff', 'assets': 'assets', 'translation': 'translation',
      'traduccionad': 'translation', 'adapting': 'adapting', 'adaptacion': 'adapting',
      'voicetests': 'voicetests', 'recording': 'recording', 'grabacion': 'recording',
      'premix': 'premix', 'qcpremix': 'qcpremix', 'qc1': 'qcpremix',
      'retakes': 'retakes', 'qcretakes': 'qcretakes', 'mix': 'mix',
      'mixbogota': 'mix', 'qcmix': 'qcmix', 'mixretakes': 'mixretakes',
      'deliveries': 'deliveries', 'entregados': 'deliveries',
    };
    return variations[lower] || lower;
  };

  const extractPhaseFromBoardName = (boardName: string): string => {
    const parts = boardName.split('-');
    return parts.length > 1 ? parts.slice(1).join('-') : boardName;
  };

  const getNextPhase = (currentPhase: string, pvz: string | null): string | null => {
    const normalized = normalizePhase(currentPhase);
    const currentIndex = PHASE_ORDER.indexOf(normalized);
    if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) return null;
    if (normalized === 'adapting' && pvz !== 'Yes') return 'recording';
    return PHASE_ORDER[currentIndex + 1];
  };

  // 1. Get current group to find board
  const { data: currentGroup, error: groupError } = await supabase
    .from('task_groups')
    .select('board_id')
    .eq('id', currentGroupId)
    .single();

  if (groupError || !currentGroup) {
    console.error('Failed to get current group:', groupError);
    return;
  }

  // 2. Get current board to find workspace and phase
  const { data: currentBoard, error: boardError } = await supabase
    .from('boards')
    .select('workspace_id, name')
    .eq('id', currentGroup.board_id)
    .single();

  if (boardError || !currentBoard) {
    console.error('Failed to get current board:', boardError);
    return;
  }

  const currentPhase = extractPhaseFromBoardName(currentBoard.name);
  const nextPhase = getNextPhase(currentPhase, pruebaDeVoz);

  if (!nextPhase) {
    console.log('Task is at final phase, no progression needed');
    return;
  }

  // 3. Get prefix from current board name (e.g., "Col", "Mia", "Se")
  const prefix = currentBoard.name.split('-')[0];

  // 4. Find the next phase board in the same workspace
  const { data: workspaceBoards, error: wbError } = await supabase
    .from('boards')
    .select('id, name')
    .eq('workspace_id', currentBoard.workspace_id)
    .neq('is_hq', true);

  if (wbError || !workspaceBoards) {
    console.error('Failed to get workspace boards:', wbError);
    return;
  }

  const nextBoard = workspaceBoards.find(b => {
    const boardPhase = extractPhaseFromBoardName(b.name);
    return normalizePhase(boardPhase) === nextPhase && b.name.startsWith(prefix);
  });

  if (!nextBoard) {
    console.log(`No board found for phase: ${nextPhase}`);
    return;
  }

  // 5. Get or create a task group in the target board
  const { data: targetGroups, error: tgError } = await supabase
    .from('task_groups')
    .select('id, name')
    .eq('board_id', nextBoard.id)
    .order('sort_order')
    .limit(1);

  if (tgError) {
    console.error('Failed to get target groups:', tgError);
    return;
  }

  let targetGroupId: string;

  if (targetGroups && targetGroups.length > 0) {
    targetGroupId = targetGroups[0].id;
  } else {
    const { data: newGroup, error: ngError } = await supabase
      .from('task_groups')
      .insert({
        board_id: nextBoard.id,
        name: 'Tasks',
        color: 'hsl(209, 100%, 46%)',
      })
      .select()
      .single();

    if (ngError || !newGroup) {
      console.error('Failed to create target group:', ngError);
      return;
    }
    targetGroupId = newGroup.id;
  }

  const nextPhaseName = extractPhaseFromBoardName(nextBoard.name);
  const currentDate = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  // 6. Move the task to the new group, update phase, and reset status
  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      group_id: targetGroupId,
      status: 'default',
      fase: nextPhaseName,
      last_updated: now,
      date_assigned: currentDate,
      date_delivered: null, // Reset for new board
    })
    .eq('id', taskId);

  if (updateError) {
    console.error('Failed to move task:', updateError);
    return;
  }

  // 7. Log the phase change
  await supabase.from('activity_log').insert({
    task_id: taskId,
    type: 'phase_change',
    field: 'fase',
    old_value: currentPhase,
    new_value: nextPhaseName,
    user_id: userId,
  });

  // Log the board change
  await supabase.from('activity_log').insert({
    task_id: taskId,
    type: 'field_change',
    field: 'board',
    old_value: currentBoard.name,
    new_value: nextBoard.name,
    user_id: userId,
  });

  console.log(`Task moved from ${currentBoard.name} to ${nextBoard.name}`);
}
