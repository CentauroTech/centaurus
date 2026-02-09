import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import { ColumnConfig, Task } from '@/types/board';
import { ColumnFilterPopover } from './ColumnFilterPopover';
import { useColumnFilters, ColumnFilter } from '@/contexts/ColumnFiltersContext';
import { isStickyColumn, getStickyLeftOffset } from './stickyColumns';

interface DraggableColumnHeaderProps {
  column: ColumnConfig;
  index: number;
  isLocked: boolean;
  allTasks: Task[];
  allColumns: ColumnConfig[];
}

export function DraggableColumnHeader({ column, index, isLocked, allTasks, allColumns }: DraggableColumnHeaderProps) {
  const isSticky = isStickyColumn(column.id);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    disabled: isLocked || isSticky,
  });

  const { filters, setFilter, clearFilter } = useColumnFilters();
  const activeFilter = filters[column.id];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const leftOffset = getStickyLeftOffset(column.id, allColumns);
  const isLastSticky = isSticky && column.id === 'workOrderNumber';

  // Determine if this column type supports filtering
  const supportsFiltering = !['privacy', 'time-tracked', 'last-updated', 'file'].includes(column.type);

  const handleSetFilter = (value: string | string[] | null, type: ColumnFilter['type']) => {
    setFilter(column.id, column.field, value, type);
  };

  const handleClearFilter = () => {
    clearFilter(column.id);
  };

  return (
    <th
      ref={setNodeRef}
      style={{
        ...style,
        left: isSticky ? leftOffset : undefined,
      }}
      className={cn(
        "py-1 px-1.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap bg-slate-100 group/header border-r border-border/50",
        column.width,
        isSticky && "sticky z-40",
        isLastSticky && "border-r-2 border-r-slate-300 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]",
        isDragging && "opacity-50 bg-slate-200",
        !isLocked && !isSticky && "cursor-grab active:cursor-grabbing"
      )}
    >
      <div className="flex items-center gap-1">
        {!isLocked && !isSticky && (
          <span
            {...attributes}
            {...listeners}
            className="opacity-0 group-hover/header:opacity-50 hover:opacity-100 transition-opacity cursor-grab"
          >
            <GripVertical className="w-3 h-3" />
          </span>
        )}
        <span className="flex-1">{column.label}</span>
        {supportsFiltering && (
          <ColumnFilterPopover
            column={column}
            tasks={allTasks}
            activeFilter={activeFilter}
            onSetFilter={handleSetFilter}
            onClearFilter={handleClearFilter}
          />
        )}
      </div>
    </th>
  );
}
