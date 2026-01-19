import { useState, useMemo } from 'react';
import { Plus, Filter, Users, Calendar, ListPlus, Lock, Unlock, RotateCcw, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskGroup } from './TaskGroup';
import { Task, User, TaskGroup as TaskGroupType } from '@/types/board';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { MultipleWODialog } from './MultipleWODialog';
import { TaskSelectionProvider } from '@/contexts/TaskSelectionContext';
import { BulkEditProvider, BulkUpdateParams } from '@/contexts/BulkEditContext';
import { useAddTaskGroup, useUpdateTaskGroup, useDeleteTaskGroup, useAddTask, useUpdateTask, useDeleteTask, useWorkspaces } from '@/hooks/useWorkspaces';
import { useMoveToNextPhase } from '@/hooks/usePhaseProgression';
import { useBulkDuplicate, useBulkDelete, useBulkMoveToPhase, useMoveTaskToPhase, useBulkUpdateField, AVAILABLE_PHASES } from '@/hooks/useBulkTaskActions';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { useAddMultipleTasks } from '@/hooks/useAddMultipleTasks';
import { useColumnOrder, syncColumnOrderToWorkspace } from '@/hooks/useColumnOrder';
import { usePermissions } from '@/hooks/usePermissions';
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
  const {
    data: currentTeamMember
  } = useCurrentTeamMember();
  const currentUserId = currentTeamMember?.id || null;
  const queryClient = useQueryClient();
  const [isMultipleWODialogOpen, setIsMultipleWODialogOpen] = useState(false);

  // Permissions
  const {
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
  } = useColumnOrder(boardId, workspaceName);

  // Fetch all workspaces to get board IDs for syncing
  const { data: workspaces } = useWorkspaces();
  const addTaskGroupMutation = useAddTaskGroup(boardId);
  const updateTaskGroupMutation = useUpdateTaskGroup(boardId);
  const deleteTaskGroupMutation = useDeleteTaskGroup(boardId);
  const addTaskMutation = useAddTask(boardId);
  const updateTaskMutation = useUpdateTask(boardId, currentUserId);
  const deleteTaskMutation = useDeleteTask(boardId);
  const moveToNextPhaseMutation = useMoveToNextPhase(boardId, currentUserId);
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
        rates: t.rates,
        showGuide: t.show_guide,
        tituloAprobadoEspanol: t.titulo_aprobado_espanol,
        workOrderNumber: t.work_order_number,
        fase: t.fase,
        startedAt: t.started_at || undefined,
        completedAt: t.completed_at || undefined,
        guestDueDate: t.guest_due_date || undefined,
        deliveryComment: t.delivery_comment || undefined,
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
        linkToColHQ: t.link_to_col_hq,
        rateInfo: t.rate_info,
        people: t.people || [],
        createdAt: new Date(t.created_at)
      }))
    }));
  }, [board.groups, board.teamMemberMap, boardPhase]);

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
        dbUpdates.date_delivered = new Date().toISOString().split('T')[0];
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
    if (updates.rates !== undefined) dbUpdates.rates = updates.rates;
    if (updates.showGuide !== undefined) dbUpdates.show_guide = updates.showGuide;
    if (updates.tituloAprobadoEspanol !== undefined) dbUpdates.titulo_aprobado_espanol = updates.tituloAprobadoEspanol;
    if (updates.workOrderNumber !== undefined) dbUpdates.work_order_number = updates.workOrderNumber;
    if (updates.fase !== undefined) dbUpdates.fase = updates.fase;
    if (updates.phaseDueDate !== undefined) dbUpdates.phase_due_date = updates.phaseDueDate;
    if (updates.aorComplete !== undefined) dbUpdates.aor_complete = updates.aorComplete;
    if (updates.studio !== undefined) dbUpdates.studio = updates.studio;
    if (updates.hq !== undefined) dbUpdates.hq = updates.hq;
    if (updates.linkToColHQ !== undefined) dbUpdates.link_to_col_hq = updates.linkToColHQ;
    if (updates.rateInfo !== undefined) dbUpdates.rate_info = updates.rateInfo;
    if (updates.guestDueDate !== undefined) dbUpdates.guest_due_date = updates.guestDueDate;
    if (updates.deliveryComment !== undefined) dbUpdates.delivery_comment = updates.deliveryComment;
    // Person fields
    if (updates.projectManager !== undefined) dbUpdates.project_manager_id = updates.projectManager?.id || null;
    if (updates.director !== undefined) dbUpdates.director_id = updates.director?.id || null;
    if (updates.tecnico !== undefined) dbUpdates.tecnico_id = updates.tecnico?.id || null;
    if (updates.qc1 !== undefined) dbUpdates.qc_1_id = updates.qc1?.id || null;
    if (updates.qcRetakes !== undefined) dbUpdates.qc_retakes_id = updates.qcRetakes?.id || null;
    if (updates.mixerBogota !== undefined) dbUpdates.mixer_bogota_id = updates.mixerBogota?.id || null;
    if (updates.mixerMiami !== undefined) dbUpdates.mixer_miami_id = updates.mixerMiami?.id || null;
    if (updates.qcMix !== undefined) dbUpdates.qc_mix_id = updates.qcMix?.id || null;
    if (updates.traductor !== undefined) dbUpdates.traductor_id = updates.traductor?.id || null;
    if (updates.adaptador !== undefined) dbUpdates.adaptador_id = updates.adaptador?.id || null;

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

    // Log the change
    const oldNames = oldPeople.map(p => p.name).join(', ') || null;
    const newNames = newPeople.map(p => p.name).join(', ') || null;
    if (oldNames !== newNames) {
      await supabase.from('activity_log').insert({
        task_id: taskId,
        type: 'field_change',
        field: 'people',
        old_value: oldNames,
        new_value: newNames,
        user_id: currentUserId
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

    // If status is changing to 'done', trigger phase progression
    if (updates.status === 'done' && groupId) {
      updateTaskMutation.mutate({
        taskId,
        updates
      }, {
        onSuccess: () => {
          // Move to next phase after status update
          moveToNextPhaseMutation.mutate({
            taskId,
            currentGroupId: groupId,
            pruebaDeVoz: pruebaDeVoz ?? null
          });
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
  const addTask = (groupId: string) => {
    // Single task creation requires branch and project_manager_id
    // Show error toast prompting to use Multiple WO tool
    addTaskMutation.mutate({
      group_id: groupId
    }, {
      onError: error => {
        console.error('Use Multiple WO tool:', error.message);
      }
    });
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
  const handleBulkUpdate = (params: BulkUpdateParams) => {
    bulkUpdateFieldMutation.mutate({
      taskIds: params.taskIds,
      field: params.field,
      value: params.value,
      displayField: params.displayField
    });
  };
  return <BulkEditProvider onBulkUpdate={handleBulkUpdate}>
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0 px-[10px]">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="w-4 h-4" />
            Person
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="w-4 h-4" />
            Due date
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Column Lock/Unlock - Admin only */}
          {isAdmin && <>
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
                        onClick={() => {
                          // Get all board IDs from the same workspace
                          const currentWorkspace = workspaces?.find(ws => 
                            ws.boards.some(b => b.id === boardId)
                          );
                          if (currentWorkspace) {
                            const allBoardIds = currentWorkspace.boards.map(b => b.id);
                            syncColumnOrderToWorkspace(boardId, allBoardIds);
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
              Multiple WO
            </Button>}
          {canCreateGroups && <Button onClick={addGroup} size="sm" className="gap-2" disabled={addTaskGroupMutation.isPending}>
              <Plus className="w-4 h-4" />
              New Group
            </Button>}
        </div>
      </div>

      {/* Multiple WO Dialog */}
      <MultipleWODialog isOpen={isMultipleWODialogOpen} onClose={() => setIsMultipleWODialogOpen(false)} onCreateTasks={(groupId, template, names) => {
        addMultipleTasksMutation.mutate({
          groupId,
          template,
          names
        });
      }} groups={board.groups.map(g => ({
        id: g.id,
        name: g.name,
        color: g.color
      }))} isCreating={addMultipleTasksMutation.isPending} />

      {/* Scrollable Board Area */}
      <div className="flex-1 overflow-auto custom-scrollbar">
      {/* Task Groups */}
        <div className="space-y-6 min-w-max">
          {transformedGroups.map(group => <TaskGroup key={group.id} group={group} onUpdateTask={handleUpdateTask} onDeleteTask={deleteTask} onAddTask={() => addTask(group.id)} onUpdateGroup={updates => updateGroup(group.id, updates)} onDeleteGroup={() => deleteGroup(group.id)} onSendToPhase={handleSendTaskToPhase} boardId={boardId} boardName={board.name} workspaceName={workspaceName} columns={columns} isLocked={isLocked || !canReorderColumns} onReorderColumns={reorderColumns} canDeleteTasks={canDeleteTasks} canDeleteGroups={canDeleteTasks} />)}
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

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar onDuplicate={handleBulkDuplicate} onDelete={handleBulkDelete} onMoveToPhase={handleBulkMove} availablePhases={AVAILABLE_PHASES} />
    </div>
    </BulkEditProvider>;
}
export function BoardView({
  board,
  boardId
}: BoardViewProps) {
  return <TaskSelectionProvider>
      <BoardViewContent board={board} boardId={boardId} />
    </TaskSelectionProvider>;
}