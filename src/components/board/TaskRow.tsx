import { useState, useCallback, useEffect } from 'react';
import { GripVertical, Trash2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, User, Phase, Status, ColumnConfig, STUDIO_OPTIONS_MIAMI, STUDIO_OPTIONS_COLOMBIA } from '@/types/board';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction
} from '@/components/ui/alert-dialog';
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
import { AsignacionCell } from './cells/AsignacionCell';
import { Checkbox } from '@/components/ui/checkbox';
import { useTaskSelection } from '@/contexts/TaskSelectionContext';
import { useBulkEdit } from '@/contexts/BulkEditContext';
import { useTaskViewers, useUpdateTaskViewers } from '@/hooks/useTaskViewers';
import { useSendGuestAssignmentNotification } from '@/hooks/useGuestNotifications';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { supabase } from '@/integrations/supabase/client';

import { RoleType } from '@/hooks/useTeamMemberRoles';
import { toast } from 'sonner';
interface TaskRowProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete?: () => void;
  boardId?: string;
  boardName?: string;
  workspaceName?: string;
  columns: ColumnConfig[];
  onSendToPhase?: (phase: string) => void;
  autoOpenPanel?: boolean;
  onPanelClose?: () => void;
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
  abbreviation: 'abbreviation',
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
  // This is a computed field, not from DB
  lastUpdated: 'last_updated',
  startedAt: 'started_at',
  completedAt: 'completed_at',
  guestDueDate: 'guest_due_date',
  deliveryComment: 'delivery_comment',
  asignacion: 'asignacion',
};

// Helper function to get task value using the mapping
const getTaskValue = (task: Task, field: string): any => {
  const dbColumn = FIELD_TO_DB_COLUMN[field] || field;
  // Try the mapped DB column first, then fall back to the original field
  return (task as any)[dbColumn] ?? (task as any)[field];
};
export function TaskRow({
  task,
  onUpdate,
  onDelete,
  boardId,
  boardName,
  workspaceName,
  columns,
  onSendToPhase,
  autoOpenPanel = false,
  onPanelClose
}: TaskRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [schedulingWarning, setSchedulingWarning] = useState<{ missing: string[] } | null>(null);
  
  // Auto-open panel when navigating from notifications
  useEffect(() => {
    if (autoOpenPanel && !isDetailsPanelOpen) {
      setIsDetailsPanelOpen(true);
    }
  }, [autoOpenPanel]);

  const handlePanelClose = () => {
    setIsDetailsPanelOpen(false);
    onPanelClose?.();
  };
  
  const {
    toggleTaskSelection,
    isSelected
  } = useTaskSelection();
  const {
    shouldApplyBulkEdit,
    getSelectedTaskIds,
    onBulkUpdate
  } = useBulkEdit();

  // Permissions and current team member for column-level access control
  const { canEditColumn } = usePermissions();
  const { data: currentTeamMember } = useCurrentTeamMember();

  // Check if a column is editable for the current user
  const isColumnEditable = useCallback((columnId: string) => {
    return canEditColumn(columnId, task, currentTeamMember?.id);
  }, [canEditColumn, task, currentTeamMember?.id]);

  // Task viewers for privacy feature
  const {
    data: viewerIds = []
  } = useTaskViewers(task.id);
  const updateViewersMutation = useUpdateTaskViewers(boardId || '');
  const sendGuestNotification = useSendGuestAssignmentNotification();
  const commentCount = task.commentCount || 0;
  const isTaskSelected = isSelected(task.id);
  const handleViewersChange = (newViewerIds: string[]) => {
    // Find newly added viewers (not in current viewerIds)
    const addedViewerIds = newViewerIds.filter(id => !viewerIds.includes(id));

    // Update viewers
    updateViewersMutation.mutate({
      taskId: task.id,
      viewerIds: newViewerIds
    });

    // Send notifications to newly added guests
    if (addedViewerIds.length > 0) {
      sendGuestNotification.mutate({
        taskId: task.id,
        taskName: task.name || 'Untitled Task',
        guestIds: addedViewerIds
      });
    }
  };
  const handleInstructionsComment = async (comment: string, viewerIds: string[]) => {
    if (!currentTeamMember?.id || !task.id) return;
    
    // Get current board phase from boardName
    const phase = boardName && boardName.includes('-') 
      ? boardName.split('-').slice(1).join('-') 
      : boardName || null;
    
    // Insert a guest-visible comment for each viewer
    for (const viewerId of viewerIds) {
      await supabase.from('comments').insert({
        task_id: task.id,
        user_id: currentTeamMember.id,
        content: comment,
        is_guest_visible: true,
        viewer_id: viewerId,
        phase,
      });
    }
  };

  const handleRoleAssignments = (assignments: RoleAssignment[]) => {
    // Apply each role assignment to the task
    assignments.forEach(assignment => {
      // Create a user object with just the id for person fields
      const userValue = {
        id: assignment.memberId,
        name: assignment.memberName
      } as any;
      handleUpdate(assignment.field, userValue);
    });
  };

  // Role fields that can be assigned via privacy dialog
  const PRIVACY_ROLE_FIELDS = ['traductor', 'adaptador', 'mixerMiami', 'qc1', 'qcMix'];
  const handleMakePublic = () => {
    // Clear viewers
    updateViewersMutation.mutate({
      taskId: task.id,
      viewerIds: []
    });

    // Clear role columns where the assigned person was a viewer
    PRIVACY_ROLE_FIELDS.forEach(field => {
      const currentValue = task[field as keyof Task] as {
        id: string;
      } | undefined;
      if (currentValue?.id && viewerIds.includes(currentValue.id)) {
        // This role column has a viewer assigned - clear it
        onUpdate({
          [field]: null
        });
      }
    });

    // Set task as public
    onUpdate({
      isPrivate: false
    });
  };

  // Handle update with bulk edit support
  const handleUpdate = useCallback((field: string, value: any) => {
    // Validate Miami Due Date cannot be later than Client Due Date
    if (field === 'entregaMiamiEnd' && value) {
      const clientDueDate = getTaskValue(task, 'entregaCliente');
      if (clientDueDate) {
        const miamiDate = new Date(value);
        const clientDate = new Date(clientDueDate as string);
        if (miamiDate > clientDate) {
          toast.error('Miami Due Date cannot be later than Client Due Date');
          return;
        }
      }
    }
    
    // Validate Client Due Date - if Miami Due Date exists, it must be >= Miami
    if (field === 'entregaCliente' && value) {
      const miamiDueDate = getTaskValue(task, 'entregaMiamiEnd');
      if (miamiDueDate) {
        const clientDate = new Date(value);
        const miamiDate = new Date(miamiDueDate as string);
        if (clientDate < miamiDate) {
          toast.error('Client Due Date cannot be earlier than Miami Due Date');
          return;
        }
      }
    }

    // Check if this task is part of a multi-selection
    if (shouldApplyBulkEdit(task.id) && onBulkUpdate) {
      const selectedIds = getSelectedTaskIds();
      const dbColumn = FIELD_TO_DB_COLUMN[field] || field;

      // For person fields, extract the ID for the database
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
      // Single task update
      onUpdate({
        [field]: value
      });
    }
  }, [task, shouldApplyBulkEdit, getSelectedTaskIds, onBulkUpdate, onUpdate]);
  const renderCell = (column: ColumnConfig) => {
    const value = getTaskValue(task, column.field);
    const disabled = !isColumnEditable(column.id);

    // Special handling for Name column - add the updates button after
    if (column.field === 'name') {
      return <div className="flex items-center gap-2">
          <TextCell value={value as string} onChange={val => handleUpdate(column.field, val)} disabled={disabled} />
          <button onClick={() => setIsDetailsPanelOpen(true)} className={cn("flex-shrink-0 flex items-center justify-center gap-1 p-1.5 rounded hover:bg-accent transition-smooth", commentCount > 0 ? "text-primary" : "text-muted-foreground")} title="Open updates">
            <MessageSquare className="w-4 h-4" />
            {commentCount > 0 && <span className="text-xs font-medium">{commentCount}</span>}
          </button>
        </div>;
    }
    switch (column.type) {
      case 'privacy':
        return <PrivacyCell isPrivate={getTaskValue(task, 'isPrivate') as boolean} onChange={val => handleUpdate('isPrivate', val)} taskId={task.id} onViewersChange={handleViewersChange} onRoleAssignments={handleRoleAssignments} onMakePublic={handleMakePublic} onGuestDueDateChange={date => handleUpdate('guestDueDate', date)} onDateAssignedChange={date => handleUpdate('dateAssigned', date)} onInstructionsComment={handleInstructionsComment} currentViewerIds={viewerIds} />;
      case 'text':
        // Make workOrderNumber read-only (it's auto-generated by database trigger)
        if (column.field === 'workOrderNumber') {
          return <span className={cn("text-sm font-mono mx-0 px-[10px]", isPrivate ? "text-slate-200" : "text-muted-foreground")}>
              {value as string || '-'}
            </span>;
        }
        return <TextCell value={value as string} onChange={val => handleUpdate(column.field, val)} disabled={disabled} />;
      case 'number':
        return <NumberCell value={value as number} onChange={val => handleUpdate(column.field, val)} disabled={disabled} displayFormat={column.field === 'cantidadEpisodios' ? 'episodes' : undefined} episodeIndex={column.field === 'cantidadEpisodios' ? task.episodeIndex : undefined} />;
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
            disabled={disabled} 
            isPrivate={isPrivate}
            hasWorkOrder={hasWorkOrder}
            currentWorkOrder={currentWO}
            branchCode={branchCode}
            pmInitials={pmInitials}
          />;
        }
        return <DateCell date={value as Date} onDateChange={val => handleUpdate(column.field, val)} disabled={disabled} isPrivate={isPrivate} />;
      case 'person':
        // Use ProjectManagerCell for project manager field
        if (column.field === 'projectManager') {
          return <ProjectManagerCell owner={value as User} onOwnerChange={val => handleUpdate(column.field, val)} disabled={disabled} />;
        }
        // Use RoleBasedOwnerCell if roleFilter is specified
        if (column.roleFilter) {
          const skipPrivacy = ['director', 'tecnico'].includes(column.field);
          return <RoleBasedOwnerCell owner={value as User} onOwnerChange={val => handleUpdate(column.field, val)} roleFilter={column.roleFilter as RoleType} disabled={disabled} onInstructionsComment={skipPrivacy ? undefined : handleInstructionsComment} taskId={task.id} />;
        }
        // Use regular OwnerCell for other person fields
        return <OwnerCell owner={value as User} onOwnerChange={val => handleUpdate(column.field, val)} disabled={disabled} />;
      case 'people':
        return <PeopleCell people={value as User[]} onChange={val => handleUpdate(column.field, val)} />;
      case 'status':
        // Check if we're in Kickoff phase
        const isKickoffPhase = boardName?.toLowerCase().includes('kickoff') || task.currentPhase?.toLowerCase() === 'kickoff' || false;
        const isColScheduling = boardName?.toLowerCase().includes('scheduling') && workspaceName?.toLowerCase().includes('col');
        const handleStatusWithValidation = (val: Status) => {
          if (val === 'done' && isColScheduling) {
            const missing: string[] = [];
            if (!task.studio) missing.push('Studio');
            if (!task.director) missing.push('Director');
            if (!task.tecnico) missing.push('Técnico');
            if (missing.length > 0) {
              setSchedulingWarning({ missing });
              return;
            }
          }
          handleUpdate('status', val);
        };
        return <StatusBadge status={getTaskValue(task, 'status') as Status} onStatusChange={handleStatusWithValidation} isKickoffPhase={isKickoffPhase} onSendToPhase={onSendToPhase} />;
      case 'phase':
        return <PhaseCell phase={value as Phase} onPhaseChange={val => handleUpdate(column.field, val)} />;
      case 'current-phase':
        // Phase rendering is handled at td level - just return the text
        return null;
      case 'boolean':
        return <BooleanCell value={value as boolean} onChange={val => handleUpdate(column.field, val)} disabled={disabled} />;
      case 'link':
        return <LinkCell value={value as string} onChange={val => handleUpdate(column.field, val)} />;
      case 'combobox':
        return <ComboboxCell value={value as string} onChange={val => handleUpdate(column.field, val)} options={column.options || []} placeholder="Select..." isPrivate={isPrivate} disabled={disabled} />;
      case 'dropdown':
        // Use workspace-specific studio options
        const dropdownOptions = column.field === 'studio' 
          ? (workspaceName?.toLowerCase().includes('miami') 
              ? STUDIO_OPTIONS_MIAMI 
              : workspaceName?.toLowerCase().includes('col') 
                ? STUDIO_OPTIONS_COLOMBIA 
                : (column.options || []))
          : (column.options || []);
        return <DropdownCell value={value as string} onChange={val => handleUpdate(column.field, val)} options={dropdownOptions} placeholder="Select..." isPrivate={isPrivate} disabled={disabled} />;
      case 'file':
        return <FileUploadCell value={value as string} onChange={val => handleUpdate(column.field, val)} placeholder="Upload" isPrivate={isPrivate} />;
      case 'auto':
        // Auto-generated field - display as read-only
        return <span className="text-sm text-muted-foreground font-mono">
            {value as string || '-'}
          </span>;
      case 'last-updated':
        return <LastUpdatedCell date={value as Date} isPrivate={isPrivate} />;
      case 'multi-select':
        return <MultiSelectCell value={value as string[]} onChange={val => handleUpdate(column.field, val)} options={column.options || []} placeholder="Select..." isPrivate={isPrivate} />;
      case 'time-tracked':
        return <TimeTrackedCell startedAt={getTaskValue(task, 'startedAt') as string} completedAt={getTaskValue(task, 'completedAt') as string} isPrivate={isPrivate} />;
      case 'asignacion': {
        const asignacionPhase = boardName && boardName.includes('-') ? boardName.split('-').slice(1).join('-') : boardName || '';
        return <AsignacionCell value={value as string} onChange={val => handleUpdate(column.field, val)} disabled={disabled} phase={asignacionPhase} />;
      }
      default:
        return <span className="text-sm text-muted-foreground">-</span>;
    }
  };
  const isPrivate = getTaskValue(task, 'isPrivate') as boolean;

  // Determine the background class for sticky columns based on state
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
  return <>
      <tr className={cn("group border-b border-border transition-smooth", isPrivate && "border-l-[6px] border-l-slate-700 bg-slate-800 text-slate-100", !isPrivate && isHovered && "bg-muted/30", !isPrivate && isTaskSelected && "bg-primary/10", isPrivate && isHovered && "bg-slate-700", isPrivate && isTaskSelected && "bg-slate-700")} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        {/* Checkbox */}
        <td className={cn("w-6 px-1 sticky left-0 z-20", stickyBg)}>
          <Checkbox checked={isTaskSelected} onCheckedChange={() => toggleTaskSelection(task.id)} className="opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-smooth h-3.5 w-3.5" />
        </td>

        {/* Drag Handle */}
        <td className={cn("w-6 px-0.5 sticky left-6 z-20", stickyBg)}>
          <div className="opacity-0 group-hover:opacity-100 transition-smooth cursor-grab">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </td>

        {/* Dynamic Columns */}
        {columns.map((column, index) => {
        // Make privacy (index 0), name (index 1), and WO# (index 2) columns sticky
        const isSticky = index <= 2;
        // Calculate left offset: checkbox (24px) + drag handle (24px) + previous sticky columns
        // privacy (w-8 = 32px), name (w-96 = 384px), WO# (w-32 = 128px)
        const leftOffset = isSticky ? index === 0 ? 48 // after checkbox + drag
        : index === 1 ? 80 // after checkbox + drag + privacy (48 + 32)
        : 464 // after checkbox + drag + privacy + name (48 + 32 + 384)
        : undefined;

        // Handle current-phase column with background directly on td
        const isPhaseColumn = column.type === 'current-phase';
        if (isPhaseColumn) {
          const phaseValue = getTaskValue(task, column.field) as string || '';
          const phaseColors: Record<string, string> = {
            'On Hold': 'bg-gray-400 text-gray-800',
            'Kickoff': 'bg-gray-900 text-white',
            'Assets': 'bg-cyan-200 text-cyan-800',
            'Translation': 'bg-blue-200 text-blue-800',
            'Adapting': 'bg-teal-500 text-white',
            'Breakdown': 'bg-orange-400 text-orange-900',
            'Casting': 'bg-yellow-400 text-yellow-900',
            'VoiceTests': 'bg-pink-400 text-white',
            'Scheduling': 'bg-lime-400 text-lime-900',
            'Recording': 'bg-red-800 text-white',
            'QC 1': 'bg-purple-200 text-purple-800',
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
          return <td key={column.id} className={cn("border-r border-border/50 px-1.5 py-1 whitespace-nowrap", column.width, isPrivate && "border-r-slate-600")}>
              <div className={cn("flex items-center justify-center text-sm font-medium px-3 py-1 rounded-md whitespace-nowrap", phaseClass)}>
                {phaseValue || '-'}
              </div>
            </td>;
        }
        return <td key={column.id} className={cn("border-r border-border/50 px-0 py-0 whitespace-nowrap", column.width, isSticky && cn("sticky z-20", stickyBg), index === 2 && "border-r-2 border-r-slate-300 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]", isPrivate && index !== 2 && "border-r-slate-600")} style={isSticky ? {
          left: leftOffset
        } : undefined}>
              {renderCell(column)}
            </td>;
      })}

        {/* Actions */}
        <td className="py-0.5 px-1.5 w-10">
          {onDelete && <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-smooth">
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>}
        </td>
      </tr>

      <TaskDetailsPanel task={task} isOpen={isDetailsPanelOpen} onClose={handlePanelClose} users={[]} boardId={boardId} workspaceName={workspaceName} viewerIds={viewerIds} />

      <AlertDialog open={!!schedulingWarning} onOpenChange={(open) => !open && setSchedulingWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Warning</AlertDialogTitle>
            <AlertDialogDescription>
              This project doesn't have {schedulingWarning?.missing.join(', ')} attached. Are you sure you want to move this task to recording?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={() => { handleUpdate('status', 'done'); setSchedulingWarning(null); }}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}