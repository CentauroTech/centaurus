import { memo, useMemo, useCallback } from 'react';
import { TaskGroup } from './TaskGroup';
import { VirtualizedTaskGroup } from './VirtualizedTaskGroup';
import { Task, ColumnConfig, User } from '@/types/board';

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

interface MemoizedBoardGroupProps {
  group: BoardGroup;
  board: BoardData;
  columns: ColumnConfig[];
  boardId: string;
  workspaceName: string;
  isLocked: boolean;
  canReorderColumns: boolean;
  canDeleteTasks: boolean;
  updatePeople: (taskId: string, newPeople: User[], oldPeople: User[]) => Promise<void>;
  updateTask: (taskId: string, updates: Record<string, any>, groupId?: string, pruebaDeVoz?: string | null, currentStatus?: string) => void;
  deleteTask: (taskId: string) => void;
  addTask: (groupId: string) => void;
  updateGroup: (groupId: string, updates: Partial<{ name: string; color: string; is_collapsed: boolean }>) => void;
  handleSendTaskToPhase: (taskId: string, phase: string) => void;
  reorderColumns: (activeId: string, overId: string) => void;
}

// Helper to extract phase from board name
const extractPhaseFromBoardName = (boardName: string): string => {
  const parts = boardName.split('-');
  return parts.length > 1 ? parts.slice(1).join('-') : boardName;
};

// Transform raw task to Task type - memoized per task
const transformTask = (
  t: any,
  boardPhase: string,
  teamMemberMap?: Map<string, any>
): Task => {
  const getTeamMember = (id: string | null | undefined) => {
    if (!id || !teamMemberMap) return undefined;
    return teamMemberMap.get(id);
  };

  return {
    id: t.id,
    groupId: t.group_id,
    name: t.name,
    status: t.status,
    isPrivate: t.is_private,
    commentCount: t.comment_count || 0,
    currentPhase: t.currentPhase || boardPhase,
    dateAssigned: t.date_assigned || undefined,
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
    createdAt: new Date(t.created_at),
  };
};

export const MemoizedBoardGroup = memo(function MemoizedBoardGroup({
  group,
  board,
  columns,
  boardId,
  workspaceName,
  isLocked,
  canReorderColumns,
  canDeleteTasks,
  updatePeople,
  updateTask,
  deleteTask,
  addTask,
  updateGroup,
  handleSendTaskToPhase,
  reorderColumns,
}: MemoizedBoardGroupProps) {
  const shouldVirtualize = group.tasks.length > 100;
  const boardPhase = useMemo(() => extractPhaseFromBoardName(board.name), [board.name]);
  
  // Memoize transformed tasks
  const transformedTasks = useMemo(() => {
    return group.tasks.map((t) => transformTask(t, boardPhase, board.teamMemberMap));
  }, [group.tasks, boardPhase, board.teamMemberMap]);

  const transformedGroup = useMemo(() => ({
    id: group.id,
    name: group.name,
    color: group.color,
    isCollapsed: group.is_collapsed,
    tasks: transformedTasks,
  }), [group.id, group.name, group.color, group.is_collapsed, transformedTasks]);

  // Memoized update handler
  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const rawTask = group.tasks.find(t => t.id === taskId);
    
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
      const realGroupId = rawTask?.group_id || group.id;
      updateTask(taskId, dbUpdates, realGroupId, rawTask?.prueba_de_voz, rawTask?.status);
    }
  }, [group.tasks, group.id, updatePeople, updateTask]);

  const handleUpdateGroup = useCallback((updates: Partial<{ name?: string; color?: string; isCollapsed?: boolean }>) => {
    const dbUpdates: Partial<{ name: string; color: string; is_collapsed: boolean }> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.isCollapsed !== undefined) dbUpdates.is_collapsed = updates.isCollapsed;
    updateGroup(group.id, dbUpdates);
  }, [group.id, updateGroup]);

  const handleAddTask = useCallback(() => {
    addTask(group.id);
  }, [group.id, addTask]);

  const handleReorderColumns = useCallback((activeId: string, overId: string) => {
    if (canReorderColumns) {
      reorderColumns(activeId, overId);
    }
  }, [canReorderColumns, reorderColumns]);

  const commonProps = {
    group: transformedGroup,
    onUpdateTask: handleUpdateTask,
    onDeleteTask: deleteTask,
    onAddTask: handleAddTask,
    onUpdateGroup: handleUpdateGroup,
    onSendToPhase: handleSendTaskToPhase,
    boardId,
    boardName: board.name,
    workspaceName,
    columns,
    isLocked: isLocked || !canReorderColumns,
    onReorderColumns: handleReorderColumns,
    canDeleteTasks,
  };

  // Use virtualized version for large groups
  if (shouldVirtualize) {
    return (
      <VirtualizedTaskGroup
        {...commonProps}
        taskViewersMap={board.taskViewersMap}
      />
    );
  }

  return <TaskGroup {...commonProps} />;
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.group === nextProps.group &&
    prevProps.columns === nextProps.columns &&
    prevProps.isLocked === nextProps.isLocked &&
    prevProps.canDeleteTasks === nextProps.canDeleteTasks
  );
});
