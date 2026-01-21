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
      deliveryComment,
      phase,
      rolePerformed,
      deliveryFileUrl,
      deliveryFileName,
    }: { 
      taskId: string; 
      deliveryComment?: string;
      phase?: string;
      rolePerformed?: string;
      deliveryFileUrl?: string;
      deliveryFileName?: string;
    }) => {
      if (!currentMember?.id) throw new Error('User not authenticated');

      const currentDate = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      // Fetch task details for the completion record
      const { data: taskDetails, error: taskError } = await supabase
        .from('tasks')
        .select(`
          name,
          work_order_number,
          titulo_aprobado_espanol,
          locked_runtime,
          cantidad_episodios,
          fase,
          branch,
          traductor_id,
          adaptador_id,
          group_id
        `)
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      // Determine role performed based on assignment
      let detectedRole = rolePerformed || 'general';
      const taskPhase = phase || taskDetails?.fase || 'unknown';
      
      if (!rolePerformed) {
        if (taskDetails?.traductor_id === currentMember.id) {
          detectedRole = 'translator';
        } else if (taskDetails?.adaptador_id === currentMember.id) {
          detectedRole = 'adapter';
        }
      }

      // Get workspace name
      let workspaceName = '';
      if (taskDetails?.group_id) {
        const { data: groupData } = await supabase
          .from('task_groups')
          .select('board_id')
          .eq('id', taskDetails.group_id)
          .single();

        if (groupData?.board_id) {
          const { data: boardData } = await supabase
            .from('boards')
            .select('workspace_id')
            .eq('id', groupData.board_id)
            .single();

          if (boardData?.workspace_id) {
            const { data: wsData } = await supabase
              .from('workspaces')
              .select('name')
              .eq('id', boardData.workspace_id)
              .single();

            workspaceName = wsData?.name || '';
          }
        }
      }

      // Insert permanent completion record for invoice history (with file info)
      const { error: historyError } = await supabase
        .from('guest_completed_tasks')
        .upsert({
          task_id: taskId,
          team_member_id: currentMember.id,
          phase: taskPhase,
          role_performed: detectedRole,
          completed_at: now,
          delivery_comment: deliveryComment || null,
          work_order_number: taskDetails?.work_order_number || null,
          task_name: taskDetails?.name || 'Untitled',
          titulo_aprobado_espanol: taskDetails?.titulo_aprobado_espanol || null,
          locked_runtime: taskDetails?.locked_runtime || null,
          cantidad_episodios: taskDetails?.cantidad_episodios || null,
          workspace_name: workspaceName || null,
          delivery_file_url: deliveryFileUrl || null,
          delivery_file_name: deliveryFileName || null,
          branch: taskDetails?.branch || null,
        }, {
          onConflict: 'task_id,team_member_id,phase,role_performed',
        });

      if (historyError) {
        console.error('Failed to insert completion history:', historyError);
        // Don't throw - completion record is secondary to actual task completion
      }

      // Update task to done - keep private status and viewer assignment
      // so task remains visible to guest in "Completed" tab until phase progression
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

      // Trigger phase progression using database function
      // This bypasses RLS restrictions that prevent guests from reading boards
      const { data: progressionResult, error: progressionError } = await supabase
        .rpc('move_task_to_next_phase', {
          p_task_id: taskId,
          p_user_id: currentMember.id,
        });

      if (progressionError) {
        console.error('Phase progression error:', progressionError);
      } else {
        console.log('Phase progression result:', progressionResult);
      }

      return data?.[0] || null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['guest-completed-history'] });
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
