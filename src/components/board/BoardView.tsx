import { Plus, Filter, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskGroup } from './TaskGroup';
import { 
  useAddTaskGroup, 
  useUpdateTaskGroup, 
  useAddTask, 
  useUpdateTask, 
  useDeleteTask 
} from '@/hooks/useWorkspaces';
import { useMoveToNextPhase } from '@/hooks/usePhaseProgression';

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
  name: string;
  is_hq: boolean;
  groups: BoardGroup[];
  teamMemberMap?: Map<string, any>;
}

interface BoardViewProps {
  board: BoardData;
  boardId: string;
}

export function BoardView({ board, boardId }: BoardViewProps) {
  const addTaskGroupMutation = useAddTaskGroup(boardId);
  const updateTaskGroupMutation = useUpdateTaskGroup(boardId);
  const addTaskMutation = useAddTask(boardId);
  const updateTaskMutation = useUpdateTask(boardId);
  const deleteTaskMutation = useDeleteTask(boardId);
  const moveToNextPhaseMutation = useMoveToNextPhase(boardId);

  const updateTask = (taskId: string, updates: Record<string, any>, groupId?: string, pruebaDeVoz?: boolean) => {
    // If status is changing to 'done', trigger phase progression
    if (updates.status === 'done' && groupId) {
      updateTaskMutation.mutate({ taskId, updates }, {
        onSuccess: () => {
          // Move to next phase after status update
          moveToNextPhaseMutation.mutate({
            taskId,
            currentGroupId: groupId,
            pruebaDeVoz: pruebaDeVoz ?? false,
          });
        },
      });
    } else {
      updateTaskMutation.mutate({ taskId, updates });
    }
  };

  const deleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };

  const addTask = (groupId: string) => {
    addTaskMutation.mutate({ group_id: groupId });
  };

  const updateGroup = (groupId: string, updates: Partial<{ name: string; color: string; is_collapsed: boolean }>) => {
    updateTaskGroupMutation.mutate({ groupId, updates });
  };

  const addGroup = () => {
    const colors = [
      'hsl(209, 100%, 46%)',
      'hsl(154, 64%, 45%)',
      'hsl(270, 50%, 60%)',
      'hsl(25, 95%, 53%)',
      'hsl(0, 72%, 51%)',
    ];
    
    addTaskGroupMutation.mutate({
      name: 'New Group',
      color: colors[board.groups.length % colors.length],
    });
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
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

        <Button onClick={addGroup} size="sm" className="gap-2" disabled={addTaskGroupMutation.isPending}>
          <Plus className="w-4 h-4" />
          New Group
        </Button>
      </div>

      {/* Scrollable Board Area */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {/* Task Groups */}
        <div className="space-y-6 min-w-max">
          {board.groups.map((group) => {
            // Helper to get team member by ID
            const getTeamMember = (id: string | null | undefined) => {
              if (!id || !board.teamMemberMap) return undefined;
              return board.teamMemberMap.get(id);
            };

            return (
              <TaskGroup
                key={group.id}
                group={{
                  id: group.id,
                  name: group.name,
                  color: group.color,
                  isCollapsed: group.is_collapsed,
                  tasks: group.tasks.map((t) => ({
                    id: t.id,
                    name: t.name,
                    status: t.status,
                    isPrivate: t.is_private,
                    commentCount: t.comment_count || 0,
                    currentPhase: t.currentPhase, // Dynamic phase from board name (HQ view)
                    dateAssigned: t.date_assigned ? new Date(t.date_assigned) : undefined,
                    branch: t.branch,
                    projectManager: getTeamMember(t.project_manager_id),
                    clientName: t.client_name,
                    entregaMiamiStart: t.entrega_miami_start ? new Date(t.entrega_miami_start) : undefined,
                    entregaMiamiEnd: t.entrega_miami_end ? new Date(t.entrega_miami_end) : undefined,
                    entregaMixRetakes: t.entrega_mix_retakes ? new Date(t.entrega_mix_retakes) : undefined,
                    entregaCliente: t.entrega_cliente ? new Date(t.entrega_cliente) : undefined,
                    entregaSesiones: t.entrega_sesiones ? new Date(t.entrega_sesiones) : undefined,
                    cantidadEpisodios: t.cantidad_episodios,
                    lockedRuntime: t.locked_runtime,
                    finalRuntime: t.final_runtime,
                    servicios: t.servicios,
                    entregaFinalDubAudio: t.entrega_final_dub_audio ? new Date(t.entrega_final_dub_audio) : undefined,
                    entregaFinalScript: t.entrega_final_script ? new Date(t.entrega_final_script) : undefined,
                    pruebaDeVoz: t.prueba_de_voz,
                    aorNeeded: t.aor_needed,
                    formato: t.formato,
                    lenguajeOriginal: t.lenguaje_original,
                    rates: t.rates,
                    showGuide: t.show_guide,
                    tituloAprobadoEspanol: t.titulo_aprobado_espanol,
                    workOrderNumber: t.work_order_number,
                    fase: t.fase,
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
                    dateDelivered: t.date_delivered ? new Date(t.date_delivered) : undefined,
                    hq: t.hq,
                    phaseDueDate: t.phase_due_date ? new Date(t.phase_due_date) : undefined,
                    linkToColHQ: t.link_to_col_hq,
                    rateInfo: t.rate_info,
                    createdAt: new Date(t.created_at),
                  })),
                }}
                onUpdateTask={(taskId, updates) => {
                  // Find the raw task data
                  const rawTask = group.tasks.find(t => t.id === taskId);
                  
                  // Convert camelCase to snake_case for database
                  const dbUpdates: Record<string, any> = {};
                  if (updates.name !== undefined) dbUpdates.name = updates.name;
                  if (updates.isPrivate !== undefined) dbUpdates.is_private = updates.isPrivate;
                  if (updates.status !== undefined) {
                    dbUpdates.status = updates.status;
                    // Auto-set date_delivered when status is 'done'
                    if (updates.status === 'done') {
                      dbUpdates.date_delivered = new Date().toISOString().split('T')[0];
                    }
                  }
                  if (updates.dateAssigned !== undefined) dbUpdates.date_assigned = updates.dateAssigned;
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
                  if (updates.pruebaDeVoz !== undefined) dbUpdates.prueba_de_voz = updates.pruebaDeVoz;
                  if (updates.aorNeeded !== undefined) dbUpdates.aor_needed = updates.aorNeeded;
                  if (updates.formato !== undefined) dbUpdates.formato = updates.formato;
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
                  // Person fields - save just the ID
                  if (updates.projectManager !== undefined) dbUpdates.project_manager_id = updates.projectManager?.id || null;
                  if (updates.director !== undefined) dbUpdates.director_id = updates.director?.id || null;
                  if (updates.tecnico !== undefined) dbUpdates.tecnico_id = updates.tecnico?.id || null;
                  if (updates.qc1 !== undefined) dbUpdates.qc_1_id = updates.qc1?.id || null;
                  if (updates.mixerBogota !== undefined) dbUpdates.mixer_bogota_id = updates.mixerBogota?.id || null;
                  if (updates.mixerMiami !== undefined) dbUpdates.mixer_miami_id = updates.mixerMiami?.id || null;
                  if (updates.qcMix !== undefined) dbUpdates.qc_mix_id = updates.qcMix?.id || null;
                  if (updates.traductor !== undefined) dbUpdates.traductor_id = updates.traductor?.id || null;
                  if (updates.adaptador !== undefined) dbUpdates.adaptador_id = updates.adaptador?.id || null;
                  
                  // Pass group.id and pruebaDeVoz for phase progression
                  updateTask(taskId, dbUpdates, group.id, rawTask?.prueba_de_voz);
                }}
                onDeleteTask={deleteTask}
                onAddTask={() => addTask(group.id)}
                onUpdateGroup={(updates) => {
                  const dbUpdates: Partial<{ name: string; color: string; is_collapsed: boolean }> = {};
                  if (updates.name !== undefined) dbUpdates.name = updates.name;
                  if (updates.color !== undefined) dbUpdates.color = updates.color;
                  if (updates.isCollapsed !== undefined) dbUpdates.is_collapsed = updates.isCollapsed;
                  updateGroup(group.id, dbUpdates);
                }}
                boardId={boardId}
                boardName={board.name}
              />
            );
          })}
        </div>

        {/* Empty State */}
        {board.groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
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
          </div>
        )}
      </div>
    </div>
  );
}
