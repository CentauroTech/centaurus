import { useState, useCallback, memo, CSSProperties } from 'react';
import { GripVertical, Trash2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, User, Phase, Status, ColumnConfig } from '@/types/board';
import { StatusBadge } from './StatusBadge';
import { OwnerCell } from './OwnerCell';
import { DateCell } from './DateCell';
import { StudioAssignedDateCell } from './cells/StudioAssignedDateCell';
import TaskDetailsPanel from './TaskDetailsPanel';
import { TextCell } from './cells/TextCell';
import { NumberCell } from './cells/NumberCell';
import { BooleanCell } from './cells/BooleanCell';
import { LinkCell } from './cells/LinkCell';
import { PeopleCell } from './cells/PeopleCell';
import { PhaseCell } from './cells/PhaseCell';
import { ComboboxCell } from './cells/ComboboxCell';
import { DropdownCell } from './cells/DropdownCell';
import { FileUploadCell } from './cells/FileUploadCell';
import { LastUpdatedCell } from './cells/LastUpdatedCell';
import { PrivacyCell, RoleAssignment } from './cells/PrivacyCell';
import { MultiSelectCell } from './cells/MultiSelectCell';
import { ProjectManagerCell } from './cells/ProjectManagerCell';
import { RoleBasedOwnerCell } from './cells/RoleBasedOwnerCell';
import { TimeTrackedCell } from './cells/TimeTrackedCell';
import { Checkbox } from '@/components/ui/checkbox';
import { useTaskSelection } from '@/contexts/TaskSelectionContext';
import { useBulkEdit } from '@/contexts/BulkEditContext';
import { useUpdateTaskViewers } from '@/hooks/useTaskViewers';
import { useSendGuestAssignmentNotification } from '@/hooks/useGuestNotifications';

import { RoleType } from '@/hooks/useTeamMemberRoles';

interface MemoizedTaskRowProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete?: () => void;
  boardId?: string;
  boardName?: string;
  workspaceName?: string;
  columns: ColumnConfig[];
  onSendToPhase?: (phase: string) => void;
  viewerIds?: string[];
  style?: CSSProperties;
}

// Map frontend field names to database column names
const FIELD_TO_DB_COLUMN: Record<string, string> = {
  name: 'name',
  isPrivate: 'is_private',
  status: 'status',
  dateAssigned: 'date_assigned',
  studioAssigned: 'studio_assigned',
  dateDelivered: 'date_delivered',
  branch: 'branch',
  clientName: 'client_name',
  entregaMiamiStart: 'entrega_miami_start',
  entregaMiamiEnd: 'entrega_miami_end',
  entregaMixRetakes: 'entrega_mix_retakes',
  entregaCliente: 'entrega_cliente',
  entregaSesiones: 'entrega_sesiones',
  cantidadEpisodios: 'cantidad_episodios',
  lockedRuntime: 'locked_runtime',
  finalRuntime: 'final_runtime',
  servicios: 'servicios',
  entregaFinalScriptItems: 'entrega_final_script_items',
  entregaFinalDubAudioItems: 'entrega_final_dub_audio_items',
  pruebaDeVoz: 'prueba_de_voz',
  aorNeeded: 'aor_needed',
  formato: 'formato',
  genre: 'genre',
  lenguajeOriginal: 'lenguaje_original',
  targetLanguage: 'target_language',
  rates: 'rates',
  showGuide: 'show_guide',
  tituloAprobadoEspanol: 'titulo_aprobado_espanol',
  workOrderNumber: 'work_order_number',
  fase: 'fase',
  phaseDueDate: 'phase_due_date',
  aorComplete: 'aor_complete',
  studio: 'studio',
  hq: 'hq',
  linkToColHQ: 'link_to_col_hq',
  rateInfo: 'rate_info',
  projectManager: 'project_manager_id',
  director: 'director_id',
  tecnico: 'tecnico_id',
  qc1: 'qc_1_id',
  qcRetakes: 'qc_retakes_id',
  mixerBogota: 'mixer_bogota_id',
  mixerMiami: 'mixer_miami_id',
  qcMix: 'qc_mix_id',
  traductor: 'traductor_id',
  adaptador: 'adaptador_id',
  people: 'people',
  currentPhase: 'currentPhase',
  lastUpdated: 'last_updated',
  startedAt: 'started_at',
  completedAt: 'completed_at',
  guestDueDate: 'guest_due_date',
  deliveryComment: 'delivery_comment'
};

// Helper function to get task value using the mapping
const getTaskValue = (task: Task, field: string): any => {
  const dbColumn = FIELD_TO_DB_COLUMN[field] || field;
  return (task as any)[dbColumn] ?? (task as any)[field];
};

export const MemoizedTaskRow = memo(function MemoizedTaskRow({
  task,
  onUpdate,
  onDelete,
  boardId,
  boardName,
  workspaceName,
  columns,
  onSendToPhase,
  viewerIds = [],
  style
}: MemoizedTaskRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const { toggleTaskSelection, isSelected } = useTaskSelection();
  const { shouldApplyBulkEdit, getSelectedTaskIds, onBulkUpdate } = useBulkEdit();

  const updateViewersMutation = useUpdateTaskViewers(boardId || '');
  const sendGuestNotification = useSendGuestAssignmentNotification();
  const commentCount = task.commentCount || 0;
  const isTaskSelected = isSelected(task.id);
  
  const handleViewersChange = useCallback((newViewerIds: string[]) => {
    const addedViewerIds = newViewerIds.filter(id => !viewerIds.includes(id));

    updateViewersMutation.mutate({
      taskId: task.id,
      viewerIds: newViewerIds
    });

    if (addedViewerIds.length > 0) {
      sendGuestNotification.mutate({
        taskId: task.id,
        taskName: task.name || 'Untitled Task',
        guestIds: addedViewerIds
      });
    }
  }, [task.id, task.name, viewerIds, updateViewersMutation, sendGuestNotification]);

  const handleRoleAssignments = useCallback((assignments: RoleAssignment[]) => {
    assignments.forEach(assignment => {
      const userValue = {
        id: assignment.memberId,
        name: assignment.memberName
      } as any;
      handleUpdate(assignment.field, userValue);
    });
  }, []);

  const PRIVACY_ROLE_FIELDS = ['traductor', 'adaptador', 'mixerMiami', 'qc1', 'qcMix'];
  
  const handleMakePublic = useCallback(() => {
    updateViewersMutation.mutate({
      taskId: task.id,
      viewerIds: []
    });

    PRIVACY_ROLE_FIELDS.forEach(field => {
      const currentValue = task[field as keyof Task] as { id: string } | undefined;
      if (currentValue?.id && viewerIds.includes(currentValue.id)) {
        onUpdate({ [field]: null });
      }
    });

    onUpdate({ isPrivate: false });
  }, [task, viewerIds, updateViewersMutation, onUpdate]);

  const handleUpdate = useCallback((field: string, value: any) => {
    if (shouldApplyBulkEdit(task.id) && onBulkUpdate) {
      const selectedIds = getSelectedTaskIds();
      const dbColumn = FIELD_TO_DB_COLUMN[field] || field;

      let dbValue = value;
      if (field.endsWith('Manager') || ['director', 'tecnico', 'qc1', 'qcRetakes', 'mixerBogota', 'mixerMiami', 'qcMix', 'traductor', 'adaptador'].includes(field)) {
        dbValue = value?.id || null;
      }
      onBulkUpdate({
        taskIds: selectedIds,
        field: dbColumn,
        value: dbValue,
        displayField: field
      });
    } else {
      onUpdate({ [field]: value });
    }
  }, [task.id, shouldApplyBulkEdit, getSelectedTaskIds, onBulkUpdate, onUpdate]);

  const renderCell = useCallback((column: ColumnConfig) => {
    const value = getTaskValue(task, column.field);
    const isPrivate = getTaskValue(task, 'isPrivate') as boolean;

    if (column.field === 'name') {
      return (
        <div className="flex items-center gap-2">
          <TextCell value={value as string} onChange={val => handleUpdate(column.field, val)} />
          <button 
            onClick={() => setIsDetailsPanelOpen(true)} 
            className={cn(
              "flex-shrink-0 flex items-center justify-center gap-1 p-1.5 rounded hover:bg-accent transition-smooth", 
              commentCount > 0 ? "text-primary" : "text-muted-foreground"
            )} 
            title="Open updates"
          >
            <MessageSquare className="w-4 h-4" />
            {commentCount > 0 && <span className="text-xs font-medium">{commentCount}</span>}
          </button>
        </div>
      );
    }

    switch (column.type) {
      case 'privacy':
        return (
          <PrivacyCell 
            isPrivate={getTaskValue(task, 'isPrivate') as boolean} 
            onChange={val => handleUpdate('isPrivate', val)} 
            taskId={task.id} 
            onViewersChange={handleViewersChange} 
            onRoleAssignments={handleRoleAssignments} 
            onMakePublic={handleMakePublic} 
            onGuestDueDateChange={date => handleUpdate('guestDueDate', date)} 
            onDateAssignedChange={date => handleUpdate('dateAssigned', date)} 
            currentViewerIds={viewerIds} 
          />
        );
      case 'text':
        if (column.field === 'workOrderNumber') {
          return (
            <span className={cn("text-sm font-mono", isPrivate ? "text-slate-200" : "text-muted-foreground")}>
              {value as string || '-'}
            </span>
          );
        }
        return <TextCell value={value as string} onChange={val => handleUpdate(column.field, val)} />;
      case 'number':
        return <NumberCell value={value as number} onChange={val => handleUpdate(column.field, val)} displayFormat={column.field === 'cantidadEpisodios' ? 'episodes' : undefined} taskName={column.field === 'cantidadEpisodios' ? task.name : undefined} />;
      case 'date':
        // Use StudioAssignedDateCell for studioAssigned field to show WO warning
        if (column.field === 'studioAssigned') {
          const hasWorkOrder = !!(getTaskValue(task, 'workOrderNumber') as string);
          const currentWO = (getTaskValue(task, 'workOrderNumber') as string) || '';
          const branch = (getTaskValue(task, 'branch') as string) || '';
          const pm = getTaskValue(task, 'projectManager') as User | undefined;
          const pmInitials = pm?.initials || '';
          
          // Map branch names to codes
          const branchCodeMap: Record<string, string> = {
            'Miami': 'M',
            'Bogota': 'B',
            'Buenos Aires': 'A',
            'Mexico': 'X'
          };
          const branchCode = branchCodeMap[branch] || branch.charAt(0).toUpperCase();
          
          return <StudioAssignedDateCell 
            date={value as Date} 
            onDateChange={val => handleUpdate(column.field, val)} 
            isPrivate={isPrivate}
            hasWorkOrder={hasWorkOrder}
            currentWorkOrder={currentWO}
            branchCode={branchCode}
            pmInitials={pmInitials}
          />;
        }
        return <DateCell date={value as Date} onDateChange={val => handleUpdate(column.field, val)} />;
      case 'person':
        if (column.field === 'projectManager') {
          return <ProjectManagerCell owner={value as User} onOwnerChange={val => handleUpdate(column.field, val)} />;
        }
        if (column.roleFilter) {
          return (
            <RoleBasedOwnerCell 
              owner={value as User} 
              onOwnerChange={val => handleUpdate(column.field, val)} 
              roleFilter={column.roleFilter as RoleType}
            />
          );
        }
        return <OwnerCell owner={value as User} onOwnerChange={val => handleUpdate(column.field, val)} />;
      case 'people':
        return <PeopleCell people={value as User[]} onChange={val => handleUpdate(column.field, val)} />;
      case 'status':
        const isKickoffPhase = boardName?.toLowerCase().includes('kickoff') || false;
        return (
          <StatusBadge 
            status={getTaskValue(task, 'status') as Status} 
            onStatusChange={val => handleUpdate('status', val)} 
            isKickoffPhase={isKickoffPhase} 
            onSendToPhase={onSendToPhase} 
          />
        );
      case 'phase':
        return <PhaseCell phase={value as Phase} onPhaseChange={val => handleUpdate(column.field, val)} />;
      case 'current-phase':
        return null;
      case 'boolean':
        return <BooleanCell value={value as boolean} onChange={val => handleUpdate(column.field, val)} />;
      case 'link':
        return <LinkCell value={value as string} onChange={val => handleUpdate(column.field, val)} />;
      case 'combobox':
        return <ComboboxCell value={value as string} onChange={val => handleUpdate(column.field, val)} options={column.options || []} placeholder="Select..." isPrivate={isPrivate} />;
      case 'dropdown':
        return <DropdownCell value={value as string} onChange={val => handleUpdate(column.field, val)} options={column.options || []} placeholder="Select..." isPrivate={isPrivate} />;
      case 'file':
        return <FileUploadCell value={value as string} onChange={val => handleUpdate(column.field, val)} placeholder="Upload" isPrivate={isPrivate} />;
      case 'auto':
        return <span className="text-sm text-muted-foreground font-mono">{value as string || '-'}</span>;
      case 'last-updated':
        return <LastUpdatedCell date={value as Date} isPrivate={isPrivate} />;
      case 'multi-select':
        return <MultiSelectCell value={value as string[]} onChange={val => handleUpdate(column.field, val)} options={column.options || []} placeholder="Select..." isPrivate={isPrivate} />;
      case 'time-tracked':
        return <TimeTrackedCell startedAt={getTaskValue(task, 'startedAt') as string} completedAt={getTaskValue(task, 'completedAt') as string} isPrivate={isPrivate} />;
      default:
        return <span className="text-sm text-muted-foreground">-</span>;
    }
  }, [task, handleUpdate, handleViewersChange, handleRoleAssignments, handleMakePublic, viewerIds, boardName, onSendToPhase, commentCount]);

  const isPrivate = getTaskValue(task, 'isPrivate') as boolean;

  const getStickyBg = () => {
    if (isPrivate) {
      if (isTaskSelected) return "bg-slate-700";
      if (isHovered) return "bg-slate-700";
      return "bg-slate-800";
    } else {
      if (isTaskSelected) return "bg-blue-50";
      if (isHovered) return "bg-slate-100";
      return "bg-white";
    }
  };
  
  const stickyBg = getStickyBg();

  return (
    <>
      <tr 
        style={style}
        className={cn(
          "group border-b border-border transition-smooth", 
          isPrivate && "border-l-[6px] border-l-slate-700 bg-slate-800 text-slate-100", 
          !isPrivate && isHovered && "bg-muted/30", 
          !isPrivate && isTaskSelected && "bg-primary/10", 
          isPrivate && isHovered && "bg-slate-700", 
          isPrivate && isTaskSelected && "bg-slate-700"
        )} 
        onMouseEnter={() => setIsHovered(true)} 
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Checkbox */}
        <td className={cn("w-6 px-1 sticky left-0 z-20", stickyBg)}>
          <Checkbox 
            checked={isTaskSelected} 
            onCheckedChange={() => toggleTaskSelection(task.id)} 
            className="opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-smooth h-3.5 w-3.5" 
          />
        </td>

        {/* Drag Handle */}
        <td className={cn("w-6 px-0.5 sticky left-6 z-20", stickyBg)}>
          <div className="opacity-0 group-hover:opacity-100 transition-smooth cursor-grab">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </td>

        {/* Dynamic Columns */}
        {columns.map((column, index) => {
          const isSticky = index <= 2;
          const leftOffset = isSticky ? index === 0 ? 48 : index === 1 ? 72 : 296 : undefined;
          
          const isPhaseColumn = column.type === 'current-phase';
          if (isPhaseColumn) {
            const phaseValue = getTaskValue(task, column.field) as string || '';
            const phaseColors: Record<string, string> = {
              'On Hold': 'bg-gray-400 text-gray-800',
              'Kickoff': 'bg-gray-900 text-white',
              'Assets': 'bg-cyan-200 text-cyan-800',
              'Translation': 'bg-blue-200 text-blue-800',
              'Adapting': 'bg-teal-500 text-white',
              'Casting': 'bg-yellow-400 text-yellow-900',
              'VoiceTests': 'bg-pink-400 text-white',
              'Recording': 'bg-red-800 text-white',
              'Premix': 'bg-pink-200 text-pink-800',
              'QC Premix': 'bg-purple-200 text-purple-800',
              'QC-Premix': 'bg-purple-200 text-purple-800',
              'Retakes': 'bg-purple-600 text-white',
              'QC Retakes': 'bg-amber-200 text-amber-800',
              'QC-Retakes': 'bg-amber-200 text-amber-800',
              'Client Retakes': 'bg-amber-700 text-white',
              'Mix': 'bg-blue-300 text-blue-900',
              'QC Mix': 'bg-purple-300 text-purple-900',
              'QC-Mix': 'bg-purple-300 text-purple-900',
              'MixRetakes': 'bg-pink-500 text-white',
              'Mix Retakes': 'bg-pink-500 text-white',
              'Deliveries': 'bg-green-500 text-white',
              'Final Delivery': 'bg-green-500 text-white'
            };
            const phaseClass = phaseColors[phaseValue] || 'bg-muted text-muted-foreground';
            
            return (
              <td 
                key={column.id} 
                className={cn(
                  "border-r border-border/50 px-1.5 py-1 whitespace-nowrap",
                  column.width,
                  isPrivate && "border-r-slate-600"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center text-sm font-medium px-3 py-1 rounded-md whitespace-nowrap",
                  phaseClass
                )}>
                  {phaseValue || '-'}
                </div>
              </td>
            );
          }
          
          return (
            <td 
              key={column.id} 
              className={cn(
                "border-r border-border/50 px-0 py-0 whitespace-nowrap", 
                column.width, 
                isSticky && cn("sticky z-20", stickyBg), 
                index === 2 && "border-r-2 border-r-slate-300 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]", 
                isPrivate && index !== 2 && "border-r-slate-600"
              )} 
              style={isSticky ? { left: leftOffset } : undefined}
            >
              {renderCell(column)}
            </td>
          );
        })}

        {/* Actions */}
        <td className="py-0.5 px-1.5 w-10">
          {onDelete && (
            <button 
              onClick={onDelete} 
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-smooth"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          )}
        </td>
      </tr>

      <TaskDetailsPanel 
        task={task} 
        isOpen={isDetailsPanelOpen} 
        onClose={() => setIsDetailsPanelOpen(false)} 
        users={[]} 
        boardId={boardId}
        workspaceName={workspaceName}
        viewerIds={viewerIds}
      />
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render if these change
  return (
    prevProps.task === nextProps.task &&
    prevProps.columns === nextProps.columns &&
    prevProps.boardId === nextProps.boardId &&
    prevProps.boardName === nextProps.boardName &&
    arraysEqual(prevProps.viewerIds || [], nextProps.viewerIds || [])
  );
});

// Helper for array comparison
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
