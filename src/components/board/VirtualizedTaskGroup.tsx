import { useState, useRef, useCallback, memo, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, MoreHorizontal } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { cn } from '@/lib/utils';
import { TaskGroup as TaskGroupType, Task, ColumnConfig } from '@/types/board';
import { MemoizedTaskRow } from './MemoizedTaskRow';
import { DraggableColumnHeader } from './DraggableColumnHeader';
import { Checkbox } from '@/components/ui/checkbox';
import { useTaskSelection } from '@/contexts/TaskSelectionContext';

interface VirtualizedTaskGroupProps {
  group: TaskGroupType;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: () => void;
  onUpdateGroup: (updates: Partial<TaskGroupType>) => void;
  onSendToPhase?: (taskId: string, phase: string) => void;
  boardId?: string;
  boardName?: string;
  workspaceName?: string;
  columns: ColumnConfig[];
  isLocked: boolean;
  onReorderColumns: (activeId: string, overId: string) => void;
  canDeleteTasks?: boolean;
  taskViewersMap?: Map<string, string[]>;
}

// Row height constant
const ROW_HEIGHT = 36;
const VISIBLE_ROWS = 30;
const BUFFER_ROWS = 10;

export const VirtualizedTaskGroup = memo(function VirtualizedTaskGroup({ 
  group, 
  onUpdateTask, 
  onDeleteTask, 
  onAddTask,
  onUpdateGroup,
  onSendToPhase,
  boardId,
  boardName,
  workspaceName,
  columns,
  isLocked,
  onReorderColumns,
  canDeleteTasks = true,
  taskViewersMap,
}: VirtualizedTaskGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(group.isCollapsed ?? false);
  const [groupName, setGroupName] = useState(group.name);
  const [scrollTop, setScrollTop] = useState(0);
  const { selectedTaskIds, selectAll, clearSelection } = useTaskSelection();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorderColumns(active.id as string, over.id as string);
    }
  }, [onReorderColumns]);

  const handleNameBlur = useCallback(() => {
    if (groupName !== group.name) {
      onUpdateGroup({ name: groupName });
    }
  }, [groupName, group.name, onUpdateGroup]);

  const groupTaskIds = useMemo(() => group.tasks.map(t => t.id), [group.tasks]);
  const allSelected = groupTaskIds.length > 0 && groupTaskIds.every(id => selectedTaskIds.has(id));
  const someSelected = groupTaskIds.some(id => selectedTaskIds.has(id)) && !allSelected;

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(groupTaskIds);
    }
  }, [allSelected, clearSelection, selectAll, groupTaskIds]);

  const columnIds = useMemo(() => columns.map(col => col.id), [columns]);

  // Calculate which rows to render based on scroll position
  const { startIndex, endIndex, visibleTasks } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const end = Math.min(group.tasks.length, start + VISIBLE_ROWS + BUFFER_ROWS * 2);
    return {
      startIndex: start,
      endIndex: end,
      visibleTasks: group.tasks.slice(start, end),
    };
  }, [scrollTop, group.tasks]);

  // Handle scroll with throttling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    // Only update if scrolled significantly (reduces re-renders)
    if (Math.abs(newScrollTop - scrollTop) > ROW_HEIGHT / 2) {
      setScrollTop(newScrollTop);
    }
  }, [scrollTop]);

  const totalHeight = group.tasks.length * ROW_HEIGHT;
  const containerHeight = Math.min(VISIBLE_ROWS * ROW_HEIGHT, totalHeight);
  const paddingTop = startIndex * ROW_HEIGHT;
  const paddingBottom = Math.max(0, (group.tasks.length - endIndex) * ROW_HEIGHT);

  return (
    <div className="mb-6">
      {/* Group Header */}
      <div className="flex items-center gap-2 mb-2 px-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-0.5 rounded hover:bg-muted transition-smooth"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
        
        <div
          className="w-1 h-5 rounded-full"
          style={{ backgroundColor: group.color }}
        />
        
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          onBlur={handleNameBlur}
          className="bg-transparent border-0 outline-none font-display font-semibold text-foreground focus:ring-0"
        />
        
        <span className="text-sm text-muted-foreground">
          {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
        </span>

        <button className="p-1 rounded hover:bg-muted transition-smooth opacity-0 group-hover:opacity-100">
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Tasks Table */}
      {!isCollapsed && (
        <div className="bg-card rounded-lg border border-border shadow-board overflow-hidden animate-fade-in">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToHorizontalAxis]}
          >
            {/* Single scrollable container */}
            <div 
              ref={scrollContainerRef}
              className="overflow-auto custom-scrollbar"
              style={{ maxHeight: containerHeight + 40 }} // +40 for header
              onScroll={handleScroll}
            >
              <table className="w-full">
                {/* Sticky Header */}
                <thead className="sticky top-0 z-30">
                  <tr className="bg-slate-100 border-b border-border shadow-sm">
                    <th className="w-6 px-1 sticky left-0 bg-slate-100 z-40">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        className={cn(
                          "transition-smooth h-3.5 w-3.5",
                          someSelected && "data-[state=unchecked]:bg-primary/30"
                        )}
                      />
                    </th>
                    <th className="w-6 sticky left-6 bg-slate-100 z-40" />
                    <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                      {columns.map((column, index) => (
                        <DraggableColumnHeader
                          key={column.id}
                          column={column}
                          index={index}
                          isLocked={isLocked}
                        />
                      ))}
                    </SortableContext>
                    <th className="w-10" />
                  </tr>
                </thead>
                
                {/* Body with virtual padding */}
                <tbody>
                  {/* Top spacer for virtual scrolling */}
                  {paddingTop > 0 && (
                    <tr style={{ height: paddingTop }}>
                      <td colSpan={columns.length + 3} />
                    </tr>
                  )}
                  
                  {/* Visible rows */}
                  {visibleTasks.map((task) => {
                    const viewerIds = taskViewersMap?.get(task.id) || [];
                    return (
                      <MemoizedTaskRow
                        key={task.id}
                        task={task}
                        onUpdate={(updates) => onUpdateTask(task.id, updates)}
                        onDelete={canDeleteTasks ? () => onDeleteTask(task.id) : undefined}
                        boardId={boardId}
                        boardName={boardName}
                        workspaceName={workspaceName}
                        columns={columns}
                        onSendToPhase={onSendToPhase ? (phase) => onSendToPhase(task.id, phase) : undefined}
                        viewerIds={viewerIds}
                      />
                    );
                  })}
                  
                  {/* Bottom spacer for virtual scrolling */}
                  {paddingBottom > 0 && (
                    <tr style={{ height: paddingBottom }}>
                      <td colSpan={columns.length + 3} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </DndContext>

          {/* Add Task Row */}
          <button
            onClick={onAddTask}
            className="w-full flex items-center gap-2 px-5 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-smooth border-t border-border"
          >
            <Plus className="w-4 h-4" />
            <span>Add task</span>
          </button>
        </div>
      )}
    </div>
  );
});
