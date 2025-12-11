import { useState } from 'react';
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
import { mockUsers } from '@/data/mockData';

interface TaskRowProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
}

export function TaskRow({ task, onUpdate, onDelete }: TaskRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);

  const commentCount = task.comments?.length || 0;

  const renderCell = (column: typeof COLUMNS[number]) => {
    const value = task[column.field];
    
    // Special handling for Name column - add the updates button after
    if (column.field === 'name') {
      return (
        <div className="flex items-center gap-2">
          <TextCell
            value={value as string}
            onChange={(val) => onUpdate({ [column.field]: val })}
          />
          <button
            onClick={() => setIsDetailsPanelOpen(true)}
            className={cn(
              "flex-shrink-0 flex items-center justify-center gap-1 p-1.5 rounded hover:bg-accent transition-smooth",
              commentCount > 0 ? "text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100"
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
      case 'text':
        return (
          <TextCell
            value={value as string}
            onChange={(val) => onUpdate({ [column.field]: val })}
          />
        );
      case 'number':
        return (
          <NumberCell
            value={value as number}
            onChange={(val) => onUpdate({ [column.field]: val })}
          />
        );
      case 'date':
        return (
          <DateCell
            date={value as Date}
            onDateChange={(val) => onUpdate({ [column.field]: val })}
          />
        );
      case 'person':
        return (
          <OwnerCell
            owner={value as User}
            onOwnerChange={(val) => onUpdate({ [column.field]: val })}
          />
        );
      case 'people':
        return (
          <PeopleCell
            people={value as User[]}
            onChange={(val) => onUpdate({ [column.field]: val })}
          />
        );
      case 'status':
        return (
          <StatusBadge
            status={task.status}
            onStatusChange={(val) => onUpdate({ status: val })}
          />
        );
      case 'phase':
        return (
          <PhaseCell
            phase={value as Phase}
            onPhaseChange={(val) => onUpdate({ [column.field]: val })}
          />
        );
      case 'boolean':
        return (
          <BooleanCell
            value={value as boolean}
            onChange={(val) => onUpdate({ [column.field]: val })}
          />
        );
      case 'link':
        return (
          <LinkCell
            value={value as string}
            onChange={(val) => onUpdate({ [column.field]: val })}
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
          isHovered && "bg-muted/30"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Drag Handle */}
        <td className="w-8 px-2 sticky left-0 bg-card z-10">
          <div className="opacity-0 group-hover:opacity-100 transition-smooth cursor-grab">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        </td>

        {/* Dynamic Columns */}
        {COLUMNS.map((column) => (
          <td 
            key={column.id} 
            className={cn("py-2 px-3", column.width)}
          >
            {renderCell(column)}
          </td>
        ))}

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
      />
    </>
  );
}
