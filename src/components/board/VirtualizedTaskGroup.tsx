import { useState, useRef, useCallback, memo } from 'react';
import { ChevronDown, ChevronRight, Plus, MoreHorizontal } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { useVirtualizer } from '@tanstack/react-virtual';
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

// Row height constant for virtualization
const ROW_HEIGHT = 36;

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
  const { selectedTaskIds, selectAll, clearSelection } = useTaskSelection();
  const parentRef = useRef<HTMLDivElement>(null);

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

  const groupTaskIds = group.tasks.map(t => t.id);
  const allSelected = groupTaskIds.length > 0 && groupTaskIds.every(id => selectedTaskIds.has(id));
  const someSelected = groupTaskIds.some(id => selectedTaskIds.has(id)) && !allSelected;

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(groupTaskIds);
    }
  }, [allSelected, clearSelection, selectAll, groupTaskIds]);

  // Column IDs for sortable context
  const columnIds = columns.map(col => col.id);

  // Virtual row renderer
  const rowVirtualizer = useVirtualizer({
    count: group.tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20, // Render 20 extra rows above/below for smooth scrolling
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // Memoized task update handlers
  const createUpdateHandler = useCallback((taskId: string) => {
    return (updates: Partial<Task>) => onUpdateTask(taskId, updates);
  }, [onUpdateTask]);

  const createDeleteHandler = useCallback((taskId: string) => {
    return () => onDeleteTask(taskId);
  }, [onDeleteTask]);

  const createSendToPhaseHandler = useCallback((taskId: string) => {
    return onSendToPhase ? (phase: string) => onSendToPhase(taskId, phase) : undefined;
  }, [onSendToPhase]);

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

      {/* Tasks Table with Virtualization */}
      {!isCollapsed && (
        <div className="bg-card rounded-lg border border-border shadow-board overflow-hidden animate-fade-in">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToHorizontalAxis]}
          >
            {/* Fixed Header */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-30">
                  <tr className="bg-slate-100 border-b border-border shadow-sm">
                    {/* Select All Checkbox */}
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
              </table>
            </div>

            {/* Virtualized Body */}
            <div 
              ref={parentRef}
              className="overflow-auto custom-scrollbar"
              style={{ maxHeight: 'calc(100vh - 300px)', minHeight: Math.min(group.tasks.length * ROW_HEIGHT + 50, 600) }}
            >
              <div style={{ height: `${totalSize}px`, position: 'relative' }}>
                <table className="w-full">
                  <tbody>
                    {virtualRows.map((virtualRow) => {
                      const task = group.tasks[virtualRow.index];
                      const viewerIds = taskViewersMap?.get(task.id) || [];
                      
                      return (
                        <MemoizedTaskRow
                          key={task.id}
                          task={task}
                          onUpdate={createUpdateHandler(task.id)}
                          onDelete={canDeleteTasks ? createDeleteHandler(task.id) : undefined}
                          boardId={boardId}
                          boardName={boardName}
                          workspaceName={workspaceName}
                          columns={columns}
                          onSendToPhase={createSendToPhaseHandler(task.id)}
                          viewerIds={viewerIds}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
