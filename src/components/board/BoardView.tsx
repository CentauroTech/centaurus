import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Filter, Users, Calendar, ListPlus, Lock, Unlock, RotateCcw, Copy, X, HelpCircle, LayoutGrid } from 'lucide-react';
import { PHASE_DUE_DATE_MAP, ALL_PHASE_DUE_DATE_FIELDS } from '@/types/board';
import { BoardGuide, useBoardGuide } from './BoardGuide';
import { addBusinessDays, getLocalDateString } from '@/lib/businessDays';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaskGroup } from './TaskGroup';
import { BoardFilterBar } from './BoardFilterBar';
import { Task, User, TaskGroup as TaskGroupType } from '@/types/board';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { MultipleWODialog } from './MultipleWODialog';
import { TaskSelectionProvider } from '@/contexts/TaskSelectionContext';
import { CalendarView } from './CalendarView';
import TaskDetailsPanel from './TaskDetailsPanel';
import { BulkEditProvider, BulkUpdateParams } from '@/contexts/BulkEditContext';
import { ColumnFiltersProvider, useColumnFilters } from '@/contexts/ColumnFiltersContext';
import { useAddTaskGroup, useUpdateTaskGroup, useDeleteTaskGroup, useAddTask, useUpdateTask, useDeleteTask, useWorkspaces } from '@/hooks/useWorkspaces';
import { isKickoffPhase } from '@/hooks/usePhaseProgression';
import { useBulkDuplicate, useBulkDelete, useBulkMoveToPhase, useMoveTaskToPhase, useBulkUpdateField, AVAILABLE_PHASES } from '@/hooks/useBulkTaskActions';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { useAddMultipleTasks } from '@/hooks/useAddMultipleTasks';
import { useColumnOrder, syncColumnOrderToWorkspace } from '@/hooks/useColumnOrder';
import { usePermissions } from '@/hooks/usePermissions';
import { useBoardRealtime } from '@/hooks/useRealtimeSubscriptions';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
interface BoardGroup {
  id: string;
  board_id: string;
  name: string;
  color: string;
  is_collapsed: boolean;
  sort_order: number;
  tasks: any[];
}
interface BoardData {
  id: string;
  workspace_id: string;
  workspaceName?: string;
  name: string;
  is_hq: boolean;
  groups: BoardGroup[];
  teamMemberMap?: Map<string, any>;
  taskViewersMap?: Map<string, string[]>;
}
interface BoardViewProps {
  board: BoardData;
  boardId: string;
}
function BoardViewContent({
  board,
  boardId
}: BoardViewProps) {
  const workspaceName = board.workspaceName || '';
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    data: currentTeamMember
  } = useCurrentTeamMember();
  const currentUserId = currentTeamMember?.id || null;
  const queryClient = useQueryClient();
  const [isMultipleWODialogOpen, setIsMultipleWODialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  
  // URL-based task selection for notification deep links
  const urlTaskId = searchParams.get('task');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(urlTaskId);

  // Sync selectedTaskId when URL ?task= param changes (e.g. notification deep link)
  useEffect(() => {
    if (urlTaskId) {
      setSelectedTaskId(urlTaskId);
    }
  }, [urlTaskId]);
  
  // Clear URL param after task is opened
  const handleTaskPanelClose = () => {
    setSelectedTaskId(null);
    if (searchParams.has('task')) {
      searchParams.delete('task');
      setSearchParams(searchParams, { replace: true });
    }
  };

  // Board guide for first-time visitors
  const { isOpen: isGuideOpen, openGuide, closeGuide } = useBoardGuide(boardId, board.name);

  // Real-time subscriptions for this board
  useBoardRealtime(boardId);

  // Permissions
  const {
    isGod,
    isAdmin,
    canReorderColumns,
    canCreateGroups,
    canDeleteTasks
  } = usePermissions();

  // Column order management
  const {
    columns,
    columnOrder,
    isLocked,
    reorderColumns,
    toggleLock,
    resetOrder
  } = useColumnOrder(boardId, workspaceName, board.name);

  // Fetch all workspaces to get board IDs for syncing
  const { data: workspaces } = useWorkspaces();
  const addTaskGroupMutation = useAddTaskGroup(boardId);
  const updateTaskGroupMutation = useUpdateTaskGroup(boardId);
  const deleteTaskGroupMutation = useDeleteTaskGroup(boardId);
  const addTaskMutation = useAddTask(boardId);
  const updateTaskMutation = useUpdateTask(boardId, currentUserId);
  const deleteTaskMutation = useDeleteTask(boardId);
  
  const moveTaskToPhaseMutation = useMoveTaskToPhase(boardId, currentUserId);
  const bulkDuplicateMutation = useBulkDuplicate(boardId);
  const bulkDeleteMutation = useBulkDelete(boardId);
  const bulkMoveMutation = useBulkMoveToPhase(boardId, currentUserId);
  const bulkUpdateFieldMutation = useBulkUpdateField(boardId, currentUserId);
  const addMultipleTasksMutation = useAddMultipleTasks(boardId);

  // Check if this is a Kickoff board
  const isKickoffBoard = board.name.toLowerCase().includes('kickoff');

  // Extract phase from board name for currentPhase field
  const boardPhase = useMemo(() => {
    const parts = board.name.split('-');
    return parts.length > 1 ? parts.slice(1).join('-') : board.name;
  }, [board.name]);

  // Transform raw DB tasks to Task type - memoized to avoid re-computation
  const transformedGroups = useMemo(() => {
    const getTeamMember = (id: string | null | undefined) => {
      if (!id || !board.teamMemberMap) return undefined;
      return board.teamMemberMap.get(id);
    };
    return board.groups.map(group => ({
      id: group.id,
      name: group.name,
      color: group.color,
      isCollapsed: group.is_collapsed,
      tasks: group.tasks.map((t: any): Task => ({
        id: t.id,
        groupId: t.group_id,
        name: t.name,
        status: t.status,
        isPrivate: t.is_private,
        commentCount: t.comment_count || 0,
        currentPhase: t.currentPhase || boardPhase,
        dateAssigned: t.date_assigned || undefined,
        studioAssigned: t.studio_assigned || undefined,
        branch: t.branch,
        projectManager: getTeamMember(t.project_manager_id),
        clientName: t.client_name,
        entregaMiamiStart: t.entrega_miami_start || undefined,
        entregaMiamiEnd: t.entrega_miami_end || undefined,
        entregaMixRetakes: t.entrega_mix_retakes || undefined,
        entregaCliente: t.entrega_cliente || undefined,
        entregaSesiones: t.entrega_sesiones || undefined,
        cantidadEpisodios: t.cantidad_episodios,
        lockedRuntime: t.locked_runtime,
        finalRuntime: t.final_runtime,
        servicios: t.servicios || [],
        entregaFinalDubAudio: t.entrega_final_dub_audio || undefined,
        entregaFinalScript: t.entrega_final_script || undefined,
        entregaFinalScriptItems: t.entrega_final_script_items || [],
        entregaFinalDubAudioItems: t.entrega_final_dub_audio_items || [],
        pruebaDeVoz: t.prueba_de_voz,
        aorNeeded: t.aor_needed,
        formato: t.formato || [],
        genre: t.genre,
        lenguajeOriginal: t.lenguaje_original,
        targetLanguage: t.target_language ? t.target_language.split(', ').filter(Boolean) : [],
        rates: t.rates,
        showGuide: t.show_guide,
        tituloAprobadoEspanol: t.titulo_aprobado_espanol,
        workOrderNumber: t.work_order_number,
        abbreviation: t.abbreviation,
        fase: t.fase,
        startedAt: t.started_at || undefined,
        completedAt: t.completed_at || undefined,
        guestDueDate: t.guest_due_date || undefined,
        deliveryComment: t.delivery_comment || undefined,
        kickoffBrief: t.kickoff_brief || undefined,
        lastUpdated: t.last_updated ? new Date(t.last_updated) : undefined,
        aorComplete: t.aor_complete,
        director: getTeamMember(t.director_id),
        studio: t.studio,
        tecnico: getTeamMember(t.tecnico_id),
        qc1: getTeamMember(t.qc_1_id),
        qcRetakes: getTeamMember(t.qc_retakes_id),
        mixerBogota: getTeamMember(t.mixer_bogota_id),
        mixerMiami: getTeamMember(t.mixer_miami_id),
        qcMix: getTeamMember(t.qc_mix_id),
        traductor: getTeamMember(t.traductor_id),
        adaptador: getTeamMember(t.adaptador_id),
        dateDelivered: t.date_delivered || undefined,
        hq: t.hq,
        phaseDueDate: t.phase_due_date || undefined,
        assetsDueDate: t.assets_due_date || undefined,
        translationDueDate: t.translation_due_date || undefined,
        adaptingDueDate: t.adapting_due_date || undefined,
        voiceTestsDueDate: t.voice_tests_due_date || undefined,
        recordingDueDate: t.recording_due_date || undefined,
        premixDueDate: t.premix_due_date || undefined,
        qcPremixDueDate: t.qc_premix_due_date || undefined,
        retakesDueDate: t.retakes_due_date || undefined,
        qcRetakesDueDate: t.qc_retakes_due_date || undefined,
        mixDueDate: t.mix_due_date || undefined,
        qcMixDueDate: t.qc_mix_due_date || undefined,
        mixRetakesDueDate: t.mix_retakes_due_date || undefined,
        linkToColHQ: t.link_to_col_hq,
        rateInfo: t.rate_info,
        people: t.people || [],
        createdAt: new Date(t.created_at)
      }))
    }));
  }, [board.groups, board.teamMemberMap, boardPhase]);

  // Flatten all tasks for column filter unique values
  const allBoardTasks = useMemo(() => {
    return transformedGroups.flatMap(g => g.tasks);
  }, [transformedGroups]);

  // Handle task update from TaskRow - convert camelCase to snake_case
  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    // Find the raw task data for context
    let rawTask: any = null;
    for (const group of board.groups) {
      rawTask = group.tasks.find((t: any) => t.id === taskId);
      if (rawTask) break;
    }

    // Convert camelCase to snake_case for database
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.isPrivate !== undefined) dbUpdates.is_private = updates.isPrivate;
    if (updates.status !== undefined) {
      dbUpdates.status = updates.status;
      if (updates.status === 'done') {
        dbUpdates.date_delivered = getLocalDateString();
        dbUpdates.completed_at = new Date().toISOString();
      }
      if (updates.status === 'working' && !rawTask?.started_at) {
        dbUpdates.started_at = new Date().toISOString();
      }
    }
    if (updates.dateAssigned !== undefined) dbUpdates.date_assigned = updates.dateAssigned;
    if (updates.studioAssigned !== undefined) dbUpdates.studio_assigned = updates.studioAssigned;
    if (updates.dateDelivered !== undefined) dbUpdates.date_delivered = updates.dateDelivered;
    if (updates.branch !== undefined) dbUpdates.branch = updates.branch;
    if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName;
    if (updates.entregaMiamiStart !== undefined) dbUpdates.entrega_miami_start = updates.entregaMiamiStart;
    if (updates.entregaMiamiEnd !== undefined) dbUpdates.entrega_miami_end = updates.entregaMiamiEnd;
    if (updates.entregaMixRetakes !== undefined) dbUpdates.entrega_mix_retakes = updates.entregaMixRetakes;
    if (updates.entregaCliente !== undefined) dbUpdates.entrega_cliente = updates.entregaCliente;
    if (updates.entregaSesiones !== undefined) dbUpdates.entrega_sesiones = updates.entregaSesiones;
    if (updates.cantidadEpisodios !== undefined) dbUpdates.cantidad_episodios = updates.cantidadEpisodios;
    if (updates.lockedRuntime !== undefined) dbUpdates.locked_runtime = updates.lockedRuntime;
    if (updates.finalRuntime !== undefined) dbUpdates.final_runtime = updates.finalRuntime;
    if (updates.servicios !== undefined) dbUpdates.servicios = updates.servicios;
    if (updates.entregaFinalDubAudio !== undefined) dbUpdates.entrega_final_dub_audio = updates.entregaFinalDubAudio;
    if (updates.entregaFinalScript !== undefined) dbUpdates.entrega_final_script = updates.entregaFinalScript;
    if (updates.entregaFinalScriptItems !== undefined) dbUpdates.entrega_final_script_items = updates.entregaFinalScriptItems;
    if (updates.entregaFinalDubAudioItems !== undefined) dbUpdates.entrega_final_dub_audio_items = updates.entregaFinalDubAudioItems;
    if (updates.pruebaDeVoz !== undefined) dbUpdates.prueba_de_voz = updates.pruebaDeVoz;
    if (updates.aorNeeded !== undefined) dbUpdates.aor_needed = updates.aorNeeded;
    if (updates.formato !== undefined) dbUpdates.formato = updates.formato;
    if (updates.genre !== undefined) dbUpdates.genre = updates.genre;
    if (updates.lenguajeOriginal !== undefined) dbUpdates.lenguaje_original = updates.lenguajeOriginal;
    if (updates.targetLanguage !== undefined) dbUpdates.target_language = Array.isArray(updates.targetLanguage) ? updates.targetLanguage.join(', ') : updates.targetLanguage;
    if (updates.kickoffBrief !== undefined) dbUpdates.kickoff_brief = updates.kickoffBrief;
    if (updates.rates !== undefined) dbUpdates.rates = updates.rates;
    if (updates.showGuide !== undefined) dbUpdates.show_guide = updates.showGuide;
    if (updates.tituloAprobadoEspanol !== undefined) dbUpdates.titulo_aprobado_espanol = updates.tituloAprobadoEspanol;
    if (updates.workOrderNumber !== undefined) dbUpdates.work_order_number = updates.workOrderNumber;
    if (updates.abbreviation !== undefined) dbUpdates.abbreviation = updates.abbreviation;
    if (updates.fase !== undefined) dbUpdates.fase = updates.fase;
    if (updates.phaseDueDate !== undefined) dbUpdates.phase_due_date = updates.phaseDueDate;
    if (updates.assetsDueDate !== undefined) dbUpdates.assets_due_date = updates.assetsDueDate;
    if (updates.translationDueDate !== undefined) dbUpdates.translation_due_date = updates.translationDueDate;
    if (updates.adaptingDueDate !== undefined) dbUpdates.adapting_due_date = updates.adaptingDueDate;
    if (updates.voiceTestsDueDate !== undefined) dbUpdates.voice_tests_due_date = updates.voiceTestsDueDate;
    if (updates.recordingDueDate !== undefined) dbUpdates.recording_due_date = updates.recordingDueDate;
    if (updates.premixDueDate !== undefined) dbUpdates.premix_due_date = updates.premixDueDate;
    if (updates.qcPremixDueDate !== undefined) dbUpdates.qc_premix_due_date = updates.qcPremixDueDate;
    if (updates.retakesDueDate !== undefined) dbUpdates.retakes_due_date = updates.retakesDueDate;
    if (updates.qcRetakesDueDate !== undefined) dbUpdates.qc_retakes_due_date = updates.qcRetakesDueDate;
    if (updates.mixDueDate !== undefined) dbUpdates.mix_due_date = updates.mixDueDate;
    if (updates.qcMixDueDate !== undefined) dbUpdates.qc_mix_due_date = updates.qcMixDueDate;
    if (updates.mixRetakesDueDate !== undefined) dbUpdates.mix_retakes_due_date = updates.mixRetakesDueDate;
    if (updates.aorComplete !== undefined) dbUpdates.aor_complete = updates.aorComplete;
    if (updates.studio !== undefined) dbUpdates.studio = updates.studio;
    if (updates.hq !== undefined) dbUpdates.hq = updates.hq;
    if (updates.linkToColHQ !== undefined) dbUpdates.link_to_col_hq = updates.linkToColHQ;
    if (updates.rateInfo !== undefined) dbUpdates.rate_info = updates.rateInfo;
    if (updates.guestDueDate !== undefined) dbUpdates.guest_due_date = updates.guestDueDate;
    if (updates.deliveryComment !== undefined) dbUpdates.delivery_comment = updates.deliveryComment;
    // Person fields - use 'in' operator to detect when field is explicitly set (including to undefined/null)
    if ('projectManager' in updates) dbUpdates.project_manager_id = updates.projectManager?.id || null;
    if ('director' in updates) dbUpdates.director_id = updates.director?.id || null;
    if ('tecnico' in updates) dbUpdates.tecnico_id = updates.tecnico?.id || null;
    if ('qc1' in updates) dbUpdates.qc_1_id = updates.qc1?.id || null;
    if ('qcRetakes' in updates) dbUpdates.qc_retakes_id = updates.qcRetakes?.id || null;
    if ('mixerBogota' in updates) dbUpdates.mixer_bogota_id = updates.mixerBogota?.id || null;
    if ('mixerMiami' in updates) dbUpdates.mixer_miami_id = updates.mixerMiami?.id || null;
    if ('qcMix' in updates) dbUpdates.qc_mix_id = updates.qcMix?.id || null;
    if ('traductor' in updates) dbUpdates.traductor_id = updates.traductor?.id || null;
    if ('adaptador' in updates) dbUpdates.adaptador_id = updates.adaptador?.id || null;

    // Check if a guest is being assigned to a role field on a private task
    // Only add guests as viewers if their role matches the current board phase
    const isTaskPrivate = rawTask?.is_private;
    const isBeingMadePrivate = updates.isPrivate === true && !isTaskPrivate;

    // Get the current board phase to determine which role column is relevant
    const currentBoardPhase = board.name.includes('-') 
      ? board.name.substring(board.name.indexOf('-') + 1) 
      : board.name;
    const normalizedPhase = currentBoardPhase.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Map board phases to their corresponding role field and db column
    const phaseToRole: Record<string, { field: string; dbCol: string }> = {
      'translation': { field: 'traductor', dbCol: 'traductor_id' },
      'adapting': { field: 'adaptador', dbCol: 'adaptador_id' },
      'adaptacion': { field: 'adaptador', dbCol: 'adaptador_id' },
      'premix': { field: 'mixerMiami', dbCol: 'mixer_miami_id' },
      'mix': { field: 'mixerMiami', dbCol: 'mixer_miami_id' },
      'qcpremix': { field: 'qc1', dbCol: 'qc_1_id' },
      'qc1': { field: 'qc1', dbCol: 'qc_1_id' },
      'qcmix': { field: 'qcMix', dbCol: 'qc_mix_id' },
      'qcretakes': { field: 'qcRetakes', dbCol: 'qc_retakes_id' },
    };

    const currentPhaseRole = phaseToRole[normalizedPhase];

    if (isTaskPrivate || isBeingMadePrivate) {
      if (currentPhaseRole) {
        // Check if the role field for the current phase is being updated
        const newPerson = updates[currentPhaseRole.field as keyof typeof updates] as User | null | undefined;
        if (newPerson && newPerson.id) {
          await addGuestViewerIfNeeded(taskId, newPerson.id);
        }

        // When making a task private, check the existing role assignment for this phase
        if (isBeingMadePrivate && rawTask) {
          const existingMemberId = rawTask[currentPhaseRole.dbCol];
          if (existingMemberId) {
            await addGuestViewerIfNeeded(taskId, existingMemberId);
          }
        }
      }
    }

    // Handle people updates separately
    if (updates.people !== undefined) {
      const oldPeople = rawTask?.people || [];
      await updatePeople(taskId, updates.people, oldPeople);
    }
    if (Object.keys(dbUpdates).length > 0) {
      const realGroupId = rawTask?.group_id;
      updateTask(taskId, dbUpdates, realGroupId, rawTask?.prueba_de_voz, rawTask?.status);
    }
  };

  // Helper function to add a guest as viewer when assigned to role field on private task
  const addGuestViewerIfNeeded = async (taskId: string, teamMemberId: string) => {
    // Check if this team member is a guest (non-Centauro email)
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('email, name')
      .eq('id', teamMemberId)
      .single();

    if (memberError || !member) return;

    const isGuest = member.email && !member.email.endsWith('@centauro.com');
    if (!isGuest) return;

    // Check if already a viewer
    const { data: existingViewer } = await supabase
      .from('task_viewers')
      .select('id')
      .eq('task_id', taskId)
      .eq('team_member_id', teamMemberId)
      .maybeSingle();

    if (existingViewer) return; // Already a viewer

    // Add as viewer
    await supabase.from('task_viewers').insert({
      task_id: taskId,
      team_member_id: teamMemberId,
    });

    // Set guest assignment dates
    const today = getLocalDateString();
    const dueDate = getLocalDateString(addBusinessDays(new Date(), 1));

    await supabase
      .from('tasks')
      .update({
        date_assigned: today,
        guest_due_date: dueDate,
      })
      .eq('id', taskId);

    console.log(`Guest ${member.name} auto-added as viewer to private task`);
  };

  // Handle people updates (junction table)
  const updatePeople = async (taskId: string, newPeople: User[], oldPeople: User[]) => {
    // Delete existing people for this task
    await supabase.from('task_people').delete().eq('task_id', taskId);

    // Insert new people
    if (newPeople.length > 0) {
      await supabase.from('task_people').insert(newPeople.map(p => ({
        task_id: taskId,
        team_member_id: p.id
      })));
    }

    // Log the change with semantic type
    const oldNames = oldPeople.map(p => p.name).join(', ') || null;
    const newNames = newPeople.map(p => p.name).join(', ') || null;
    if (oldNames !== newNames) {
      // Determine the semantic type based on what changed
      let activityType = 'field_change';
      if (newNames && !oldNames) {
        activityType = 'people_added';
      } else if (!newNames && oldNames) {
        activityType = 'people_removed';
      } else if (newPeople.length > oldPeople.length) {
        activityType = 'people_added';
      } else if (newPeople.length < oldPeople.length) {
        activityType = 'people_removed';
      }
      
      await supabase.from('activity_log').insert({
        task_id: taskId,
        type: activityType,
        field: 'people',
        old_value: oldNames,
        new_value: newNames,
        user_id: currentUserId,
        context_phase: boardPhase,
      });
    }

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({
      queryKey: ['board', boardId]
    });
    queryClient.invalidateQueries({
      queryKey: ['activity-log']
    });
  };
  const updateTask = (taskId: string, updates: Record<string, any>, groupId?: string, pruebaDeVoz?: string | null, currentStatus?: string) => {
    // STATUS LOCKING: Block status change FROM "Done" unless admin
    if (updates.status && currentStatus === 'done' && updates.status !== 'done' && !isAdmin) {
      console.error('Cannot change status after task is marked as Done. Contact admin to revert.');
      return;
    }

    // TIMER TRACKING: Set started_at when changing TO "Working on It"
    if (updates.status === 'working' && currentStatus !== 'working') {
      // We'll set started_at in the mutation if not already set
      updates._checkStartedAt = true;
    }

    // TIMER TRACKING: Set completed_at when changing TO "Done"
    if (updates.status === 'done') {
      updates.completed_at = new Date().toISOString();
    }

    // If status is changing to 'done', trigger phase progression via DB function
    if (updates.status === 'done' && groupId) {
      updateTaskMutation.mutate({
        taskId,
        updates
      }, {
        onSuccess: async () => {
          // Use DB function which handles auto-privatization for guest assignments
          const { data: result, error } = await supabase.rpc('move_task_to_next_phase', {
            p_task_id: taskId,
            p_user_id: currentUserId || '',
          });

          if (error) {
            console.error('Failed to move task:', error);
            toast.error('Failed to move task to next phase');
          } else if (result && (result as any).success) {
            const newPhase = (result as any).new_phase;
            toast.success(`Task moved to ${newPhase}`);
            
            // Apply phase automations (people assignments + notifications)
            if (newPhase && board) {
              try {
                const { applyPhaseAutomation, normalizePhase } = await import('@/hooks/usePhaseProgression');
                const normalizedPhase = normalizePhase(newPhase);
                await applyPhaseAutomation(taskId, normalizedPhase, board.workspace_id, currentUserId);
              } catch (e) {
                console.error('Failed to apply phase automation:', e);
              }
            }
          }
          queryClient.invalidateQueries({ queryKey: ['board'] });
          queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        }
      });
    } else {
      updateTaskMutation.mutate({
        taskId,
        updates
      });
    }
  };
  const deleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };
  // Track selected group for Multiple WO dialog
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const addTask = (groupId: string) => {
    // Open Multiple WO dialog instead of single task creation
    // (Single tasks require branch and project_manager_id which the dialog provides)
    setSelectedGroupId(groupId);
    setIsMultipleWODialogOpen(true);
  };
  const updateGroup = (groupId: string, updates: Partial<{
    name: string;
    color: string;
    is_collapsed: boolean;
  }>) => {
    updateTaskGroupMutation.mutate({
      groupId,
      updates
    });
  };
  const deleteGroup = (groupId: string) => {
    deleteTaskGroupMutation.mutate(groupId);
  };
  const addGroup = () => {
    const colors = ['hsl(209, 100%, 46%)', 'hsl(154, 64%, 45%)', 'hsl(270, 50%, 60%)', 'hsl(25, 95%, 53%)', 'hsl(0, 72%, 51%)'];
    addTaskGroupMutation.mutate({
      name: 'New Group',
      color: colors[board.groups.length % colors.length]
    });
  };
  const handleBulkDuplicate = (taskIds: string[]) => {
    bulkDuplicateMutation.mutate(taskIds);
  };
  const handleBulkDelete = (taskIds: string[]) => {
    bulkDeleteMutation.mutate(taskIds);
  };
  const handleBulkMove = (taskIds: string[], phase: string) => {
    bulkMoveMutation.mutate({
      taskIds,
      targetPhase: phase
    });
  };
  const handleSendTaskToPhase = (taskId: string, phase: string) => {
    moveTaskToPhaseMutation.mutate({
      taskId,
      targetPhase: phase
    });
  };
  const handleBulkUpdate = async (params: BulkUpdateParams) => {
    // If bulk-updating status to 'done', trigger phase progression for each task
    if (params.field === 'status' && params.value === 'done') {
      const now = new Date().toISOString();

      // Update all tasks' status to done first (single batch)
      await supabase
        .from('tasks')
        .update({ status: 'done', completed_at: now })
        .in('id', params.taskIds);

      // Then call the DB function for each task in parallel
      const results = await Promise.all(
        params.taskIds.map(taskId =>
          supabase.rpc('move_task_to_next_phase', {
            p_task_id: taskId,
            p_user_id: currentUserId || '',
          })
        )
      );

      const successCount = results.filter(r => !r.error && (r.data as any)?.success).length;
      if (successCount > 0) {
        toast.success(`Moved ${successCount} ${successCount === 1 ? 'task' : 'tasks'} to next phase`);
      }
      const failures = results.filter(r => r.error || !(r.data as any)?.success);
      if (failures.length > 0) {
        console.error('Some tasks failed to move:', failures);
      }

      // Apply phase automations for successfully moved tasks
      for (const result of results) {
        if (!result.error && (result.data as any)?.success) {
          const data = result.data as any;
          const newPhase = data.new_phase;
          if (newPhase) {
            const idx = results.indexOf(result);
            const taskId = params.taskIds[idx];
            try {
              const { applyPhaseAutomation, normalizePhase } = await import('@/hooks/usePhaseProgression');
              const normalizedPhase = normalizePhase(newPhase);
              await applyPhaseAutomation(taskId, normalizedPhase, board.workspace_id, currentUserId);
            } catch (e) {
              console.error('Failed to apply phase automation for task:', taskId, e);
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      return;
    }

    bulkUpdateFieldMutation.mutate({
      taskIds: params.taskIds,
      field: params.field,
      value: params.value,
      displayField: params.displayField
    });
  };
  const { 
    activeFilterCount, 
    clearAllFilters, 
    searchQuery, 
    setSearchQuery,
    statusFilters,
    setStatusFilters,
    personFilters,
    setPersonFilters,
    clientFilters,
    setClientFilters,
    phaseFilters,
    setPhaseFilters
  } = useColumnFilters();

  return <BulkEditProvider onBulkUpdate={handleBulkUpdate}>
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      {/* Filter Bar - only show in table mode */}
      {viewMode === 'table' && (
        <div className="flex-shrink-0 px-[10px]">
          <BoardFilterBar
            allTasks={allBoardTasks}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilters={statusFilters}
            onStatusFiltersChange={setStatusFilters}
            personFilters={personFilters}
            onPersonFiltersChange={setPersonFilters}
            clientFilters={clientFilters}
            onClientFiltersChange={setClientFilters}
            phaseFilters={phaseFilters}
            onPhaseFiltersChange={setPhaseFilters}
            isHQ={board.is_hq}
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 px-[10px]">
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none h-8 px-3"
              onClick={() => setViewMode('table')}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Table
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none h-8 px-3"
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Calendar
            </Button>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={openGuide} size="sm" variant="ghost" className="gap-2">
                <HelpCircle className="w-4 h-4" />
                Guide
              </Button>
            </TooltipTrigger>
            <TooltipContent>View workflow guide for this phase</TooltipContent>
          </Tooltip>

          {/* Column Lock/Unlock - God only */}
          {isGod && <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={toggleLock} size="sm" variant={isLocked ? "default" : "outline"} className="gap-2">
                    {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    {isLocked ? 'Locked' : 'Unlocked'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isLocked ? 'Click to unlock column reordering' : 'Click to lock column order'}
                </TooltipContent>
              </Tooltip>
              
              {!isLocked && <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={resetOrder} size="sm" variant="ghost" className="gap-2">
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reset to default column order</TooltipContent>
                  </Tooltip>
                  
                  {/* Sync to workspace button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={async () => {
                          const currentWorkspace = workspaces?.find(ws => 
                            ws.boards.some(b => b.id === boardId)
                          );
                          if (currentWorkspace) {
                            const allBoardIds = currentWorkspace.boards.map(b => b.id);
                            await syncColumnOrderToWorkspace(boardId, allBoardIds, currentUserId);
                            toast.success(`Column order synced to all ${currentWorkspace.name} boards`);
                          }
                        }} 
                        size="sm" 
                        variant="ghost" 
                        className="gap-2"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Sync column order to all boards in this workspace</TooltipContent>
                  </Tooltip>
                </>}
            </>}

          {isKickoffBoard && <Button onClick={() => setIsMultipleWODialogOpen(true)} size="sm" variant="outline" className="gap-2">
              <ListPlus className="w-4 h-4" />
              Create WO
            </Button>}
          {canCreateGroups && <Button onClick={addGroup} size="sm" className="gap-2" disabled={addTaskGroupMutation.isPending}>
              <Plus className="w-4 h-4" />
              New Group
            </Button>}
        </div>
      </div>

      {/* Multiple WO Dialog */}
      <MultipleWODialog 
        isOpen={isMultipleWODialogOpen} 
        onClose={() => {
          setIsMultipleWODialogOpen(false);
          setSelectedGroupId(null);
        }} 
        onCreateTasks={(groupId, template, names, branches) => {
          addMultipleTasksMutation.mutate({
            groupId,
            template,
            names,
            branches
          });
        }} 
        groups={board.groups.map(g => ({
          id: g.id,
          name: g.name,
          color: g.color
        }))} 
        isCreating={addMultipleTasksMutation.isPending}
        defaultGroupId={selectedGroupId}
        currentWorkspaceName={workspaceName}
      />

      {/* Board Guide Dialog */}
      <BoardGuide 
        boardName={board.name} 
        isOpen={isGuideOpen} 
        onClose={closeGuide} 
      />

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <CalendarView
          tasks={allBoardTasks}
          onTaskClick={(taskId) => setSelectedTaskId(taskId)}
          onUpdateTask={handleUpdateTask}
          boardName={board.name}
          isHQ={board.is_hq}
        />
      )}

      {/* Task Details Panel for Calendar View */}
      {viewMode === 'calendar' && selectedTaskId && (() => {
        const selectedTask = allBoardTasks.find(t => t.id === selectedTaskId);
        return selectedTask ? (
          <TaskDetailsPanel
            task={selectedTask}
            isOpen={true}
            onClose={handleTaskPanelClose}
            boardId={boardId}
            workspaceName={workspaceName}
          />
        ) : null;
      })()}

      {/* Scrollable Board Area */}
      {viewMode === 'table' && (
        <div className="flex-1 overflow-auto custom-scrollbar">
        {/* Task Groups */}
          <div className="space-y-6 min-w-max">
            {transformedGroups.map(group => <TaskGroup key={group.id} group={group} onUpdateTask={handleUpdateTask} onDeleteTask={deleteTask} onAddTask={() => addTask(group.id)} onUpdateGroup={updates => updateGroup(group.id, updates)} onDeleteGroup={() => deleteGroup(group.id)} onSendToPhase={handleSendTaskToPhase} boardId={boardId} boardName={board.name} workspaceName={workspaceName} columns={columns} isLocked={isLocked || !canReorderColumns} onReorderColumns={reorderColumns} canDeleteTasks={canDeleteTasks} canDeleteGroups={canDeleteTasks} allBoardTasks={allBoardTasks} selectedTaskId={selectedTaskId} onTaskPanelClose={handleTaskPanelClose} />)}
          </div>

          {/* Empty State */}
          {board.groups.length === 0 && <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">No groups yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first group to start organizing tasks
              </p>
              <Button onClick={addGroup} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Group
              </Button>
            </div>}
        </div>
      )}

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar onDuplicate={handleBulkDuplicate} onDelete={handleBulkDelete} onMoveToPhase={handleBulkMove} availablePhases={AVAILABLE_PHASES} />
    </div>
    </BulkEditProvider>;
}
export function BoardView({
  board,
  boardId
}: BoardViewProps) {
  return (
    <TaskSelectionProvider>
      <ColumnFiltersProvider>
        <BoardViewContent board={board} boardId={boardId} />
      </ColumnFiltersProvider>
    </TaskSelectionProvider>
  );
}