import { useState, useRef, useCallback, memo, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, ChevronUp } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { cn } from '@/lib/utils';
import { TaskGroup as TaskGroupType, Task, ColumnConfig } from '@/types/board';
import { MemoizedTaskRow } from './MemoizedTaskRow';
import { DraggableColumnHeader } from './DraggableColumnHeader';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useTaskSelection } from '@/contexts/TaskSelectionContext';
import { useColumnFilters } from '@/contexts/ColumnFiltersContext';

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
  allBoardTasks: Task[];
}

// How many tasks to show per page
const TASKS_PER_PAGE = 50;

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
  allBoardTasks,
}: VirtualizedTaskGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(group.isCollapsed ?? false);
  const [groupName, setGroupName] = useState(group.name);
  const [visibleCount, setVisibleCount] = useState(TASKS_PER_PAGE);
  const { selectedTaskIds, selectAll, clearSelection } = useTaskSelection();
  const { filterTasks } = useColumnFilters();

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

  // Apply filters to group tasks
  const filteredTasks = useMemo(() => {
    return filterTasks(group.tasks);
  }, [group.tasks, filterTasks]);

  const groupTaskIds = useMemo(() => filteredTasks.map(t => t.id), [filteredTasks]);
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

  // Paginated tasks
  const visibleTasks = useMemo(() => {
    return filteredTasks.slice(0, visibleCount);
  }, [filteredTasks, visibleCount]);

  const hasMore = visibleCount < filteredTasks.length;
  const remainingCount = filteredTasks.length - visibleCount;

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + TASKS_PER_PAGE, filteredTasks.length));
  }, [filteredTasks.length]);

  const showLess = useCallback(() => {
    setVisibleCount(TASKS_PER_PAGE);
  }, []);

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
          {filteredTasks.length !== group.tasks.length 
            ? `${filteredTasks.length} of ${group.tasks.length} tasks`
            : `${group.tasks.length} ${group.tasks.length === 1 ? 'task' : 'tasks'}`
          }
          {hasMore && ` (showing ${visibleCount})`}
        </span>

        <button className="p-1 rounded hover:bg-muted transition-smooth opacity-0 group-hover:opacity-100">
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Tasks Table */}
      {!isCollapsed && (
        <div className="bg-card rounded-lg border border-border shadow-board overflow-visible animate-fade-in">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToHorizontalAxis]}
          >
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
                        allTasks={allBoardTasks}
                      />
                    ))}
                  </SortableContext>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
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
              </tbody>
            </table>
          </DndContext>

          {/* Load More / Show Less Controls */}
          {(hasMore || visibleCount > TASKS_PER_PAGE) && (
            <div className="flex items-center justify-center gap-2 py-2 border-t border-border bg-muted/30">
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  className="gap-2 text-primary"
                >
                  <ChevronDown className="w-4 h-4" />
                  Load {Math.min(TASKS_PER_PAGE, remainingCount)} more ({remainingCount} remaining)
                </Button>
              )}
              {visibleCount > TASKS_PER_PAGE && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={showLess}
                  className="gap-2 text-muted-foreground"
                >
                  <ChevronUp className="w-4 h-4" />
                  Show less
                </Button>
              )}
            </div>
          )}

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
