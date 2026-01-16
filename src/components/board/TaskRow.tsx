import { useState, useCallback } from 'react';
import { GripVertical, Trash2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, User, COLUMNS, Phase } from '@/types/board';
import { StatusBadge } from './StatusBadge';
import { OwnerCell } from './OwnerCell';
import { DateCell } from './DateCell';
import { TaskDetailsPanel } from './TaskDetailsPanel';
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
import { PrivacyCell } from './cells/PrivacyCell';
import { MultiSelectCell } from './cells/MultiSelectCell';
import { Checkbox } from '@/components/ui/checkbox';
import { useTaskSelection } from '@/contexts/TaskSelectionContext';
import { useBulkEdit } from '@/contexts/BulkEditContext';
import { mockUsers } from '@/data/mockData';

interface TaskRowProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  boardId?: string;
  boardName?: string;
  onSendToPhase?: (phase: string) => void;
}

// Map frontend field names to database column names
const FIELD_TO_DB_COLUMN: Record<string, string> = {
  name: 'name',
  isPrivate: 'is_private',
  status: 'status',
  dateAssigned: 'date_assigned',
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
  currentPhase: 'fase',
};

export function TaskRow({ task, onUpdate, onDelete, boardId, boardName, onSendToPhase }: TaskRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const { toggleTaskSelection, isSelected } = useTaskSelection();
  const { shouldApplyBulkEdit, getSelectedTaskIds, onBulkUpdate } = useBulkEdit();

  const commentCount = task.commentCount || 0;
  const isTaskSelected = isSelected(task.id);

  // Handle update with bulk edit support
  const handleUpdate = useCallback((field: string, value: any) => {
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
        displayField: field,
      });
    } else {
      // Single task update
      onUpdate({ [field]: value });
    }
  }, [task.id, shouldApplyBulkEdit, getSelectedTaskIds, onBulkUpdate, onUpdate]);

  const renderCell = (column: typeof COLUMNS[number]) => {
    const value = task[column.field];
    
    // Special handling for Name column - add the updates button after
    if (column.field === 'name') {
      return (
        <div className="flex items-center gap-2">
          <TextCell
            value={value as string}
            onChange={(val) => handleUpdate(column.field, val)}
          />
          <button
            onClick={() => setIsDetailsPanelOpen(true)}
            className={cn(
              "flex-shrink-0 flex items-center justify-center gap-1 p-1.5 rounded hover:bg-accent transition-smooth",
              commentCount > 0 ? "text-primary" : "text-muted-foreground"
            )}
            title="Open updates"
          >
            <MessageSquare className="w-4 h-4" />
            {commentCount > 0 && (
              <span className="text-xs font-medium">{commentCount}</span>
            )}
          </button>
        </div>
      );
    }
    
    switch (column.type) {
      case 'privacy':
        return (
          <PrivacyCell
            isPrivate={task.isPrivate}
            onChange={(val) => handleUpdate('isPrivate', val)}
          />
        );
      case 'text':
        return (
          <TextCell
            value={value as string}
            onChange={(val) => handleUpdate(column.field, val)}
          />
        );
      case 'number':
        return (
          <NumberCell
            value={value as number}
            onChange={(val) => handleUpdate(column.field, val)}
          />
        );
      case 'date':
        return (
          <DateCell
            date={value as Date}
            onDateChange={(val) => handleUpdate(column.field, val)}
          />
        );
      case 'person':
        return (
          <OwnerCell
            owner={value as User}
            onOwnerChange={(val) => handleUpdate(column.field, val)}
          />
        );
      case 'people':
        return (
          <PeopleCell
            people={value as User[]}
            onChange={(val) => handleUpdate(column.field, val)}
          />
        );
      case 'status':
        // Check if we're in Kickoff phase
        const isKickoffPhase = boardName?.toLowerCase().includes('kickoff') || false;
        return (
          <StatusBadge
            status={task.status}
            onStatusChange={(val) => handleUpdate('status', val)}
            isKickoffPhase={isKickoffPhase}
            onSendToPhase={onSendToPhase}
          />
        );
      case 'phase':
        return (
          <PhaseCell
            phase={value as Phase}
            onPhaseChange={(val) => handleUpdate(column.field, val)}
          />
        );
      case 'current-phase':
        // Read-only phase badge showing current board/phase with phase-specific colors
        const phaseValue = value as string || '';
        const phaseColors: Record<string, string> = {
          'Kickoff': 'bg-black text-white',
          'Assets': 'bg-orange-500 text-white',
          'Translation': 'bg-violet-500 text-white',
          'Adapting': 'bg-purple-500 text-white',
          'VoiceTests': 'bg-pink-500 text-white',
          'Recording': 'bg-emerald-500 text-white',
          'Premix': 'bg-cyan-500 text-white',
          'QC Premix': 'bg-yellow-500 text-foreground',
          'Retakes': 'bg-red-500 text-white',
          'QC Retakes': 'bg-amber-500 text-foreground',
          'Mix': 'bg-blue-500 text-white',
          'QC Mix': 'bg-sky-500 text-white',
          'MixRetakes': 'bg-rose-500 text-white',
          'Deliveries': 'bg-green-500 text-white',
        };
        const phaseClass = phaseColors[phaseValue] || 'bg-primary/10 text-primary';
        return (
          <span className={cn("inline-flex items-center px-2 py-1 rounded text-xs font-medium", phaseClass)}>
            {phaseValue || '-'}
          </span>
        );
      case 'boolean':
        return (
          <BooleanCell
            value={value as boolean}
            onChange={(val) => handleUpdate(column.field, val)}
          />
        );
      case 'link':
        return (
          <LinkCell
            value={value as string}
            onChange={(val) => handleUpdate(column.field, val)}
          />
        );
      case 'combobox':
        return (
          <ComboboxCell
            value={value as string}
            onChange={(val) => handleUpdate(column.field, val)}
            options={column.options || []}
            placeholder="Select..."
          />
        );
      case 'dropdown':
        return (
          <DropdownCell
            value={value as string}
            onChange={(val) => handleUpdate(column.field, val)}
            options={column.options || []}
            placeholder="Select..."
          />
        );
      case 'file':
        return (
          <FileUploadCell
            value={value as string}
            onChange={(val) => handleUpdate(column.field, val)}
            placeholder="Upload"
          />
        );
      case 'auto':
        // Auto-generated field - display as read-only
        return (
          <span className="text-sm text-muted-foreground font-mono">
            {value as string || '-'}
          </span>
        );
      case 'last-updated':
        return (
          <LastUpdatedCell date={value as Date} />
        );
      case 'multi-select':
        return (
          <MultiSelectCell
            value={value as string[]}
            onChange={(val) => handleUpdate(column.field, val)}
            options={column.options || []}
            placeholder="Select..."
          />
        );
      default:
        return <span className="text-sm text-muted-foreground">-</span>;
    }
  };

  return (
    <>
      <tr
        className={cn(
          "group border-b border-border transition-smooth",
          isHovered && "bg-muted/30",
          isTaskSelected && "bg-primary/10"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Checkbox */}
        <td className="w-8 px-2 sticky left-0 bg-card z-10">
          <Checkbox
            checked={isTaskSelected}
            onCheckedChange={() => toggleTaskSelection(task.id)}
            className="opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-smooth"
          />
        </td>

        {/* Drag Handle */}
        <td className="w-8 px-2 sticky left-8 bg-card z-10">
          <div className="opacity-0 group-hover:opacity-100 transition-smooth cursor-grab">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        </td>

        {/* Dynamic Columns */}
        {COLUMNS.map((column, index) => {
          // Make privacy (index 0) and name (index 1) columns sticky
          const isSticky = index <= 1;
          // Calculate left offset: checkbox (32px) + drag handle (32px) + previous sticky columns
          const leftOffset = isSticky 
            ? index === 0 
              ? 64  // left-16 (after checkbox + drag)
              : 96  // left-24 (after checkbox + drag + privacy)
            : undefined;
          
          return (
            <td 
              key={column.id} 
              className={cn(
                "py-2 px-3", 
                column.width,
                isSticky && "sticky bg-card z-10"
              )}
              style={isSticky ? { left: leftOffset } : undefined}
            >
              {renderCell(column)}
            </td>
          );
        })}

        {/* Actions */}
        <td className="py-2 px-3 w-12">
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-smooth"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </td>
      </tr>

      <TaskDetailsPanel
        task={task}
        isOpen={isDetailsPanelOpen}
        onClose={() => setIsDetailsPanelOpen(false)}
        users={mockUsers}
        boardId={boardId}
      />
    </>
  );
}
