import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import { ColumnConfig } from '@/types/board';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';

interface DraggableColumnHeaderProps {
  column: ColumnConfig;
  index: number;
  isLocked: boolean;
}

export function DraggableColumnHeader({ column, index, isLocked }: DraggableColumnHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    disabled: isLocked || index <= 2, // First 3 columns (privacy, WO#, name) are sticky and not draggable
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Make first 3 columns (privacy, name, WO#) sticky
  const isSticky = index <= 2;
  const leftOffset = isSticky 
    ? index === 0 
      ? 48  // after checkbox + drag
      : index === 1
        ? 72  // after checkbox + drag + privacy (48 + 24)
        : 296  // after checkbox + drag + privacy + name (48 + 24 + 224)
    : undefined;

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
        index === 2 && "border-r-2 border-r-slate-300 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]",
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
        <span>{column.label}</span>
      </div>
    </th>
  );
}