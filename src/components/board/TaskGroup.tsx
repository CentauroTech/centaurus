import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskGroup as TaskGroupType, Task, COLUMNS, COLUMNS_COLOMBIA, ColumnConfig } from '@/types/board';
import { TaskRow } from './TaskRow';
import { Checkbox } from '@/components/ui/checkbox';
import { useTaskSelection } from '@/contexts/TaskSelectionContext';

interface TaskGroupProps {
  group: TaskGroupType;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: () => void;
  onUpdateGroup: (updates: Partial<TaskGroupType>) => void;
  onSendToPhase?: (taskId: string, phase: string) => void;
  boardId?: string;
  boardName?: string;
  workspaceName?: string;
}

export function TaskGroup({ 
  group, 
  onUpdateTask, 
  onDeleteTask, 
  onAddTask,
  onUpdateGroup,
  onSendToPhase,
  boardId,
  boardName,
  workspaceName,
}: TaskGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(group.isCollapsed ?? false);
  const [groupName, setGroupName] = useState(group.name);
  const { selectedTaskIds, selectAll, clearSelection } = useTaskSelection();
  
  // Select columns based on workspace
  const columns: ColumnConfig[] = workspaceName === 'Colombia' ? COLUMNS_COLOMBIA : COLUMNS;

  const handleNameBlur = () => {
    if (groupName !== group.name) {
      onUpdateGroup({ name: groupName });
    }
  };

  const groupTaskIds = group.tasks.map(t => t.id);
  const allSelected = groupTaskIds.length > 0 && groupTaskIds.every(id => selectedTaskIds.has(id));
  const someSelected = groupTaskIds.some(id => selectedTaskIds.has(id)) && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(groupTaskIds);
    }
  };

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
        <div className="bg-card rounded-lg border border-border shadow-board overflow-visible animate-fade-in">
          <table className="w-full">
            <thead className="sticky top-0 z-30">
              <tr className="bg-slate-100 border-b border-border shadow-sm">
                {/* Select All Checkbox */}
                <th className="w-8 px-2 sticky left-0 bg-slate-100 z-40">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    className={cn(
                      "transition-smooth",
                      someSelected && "data-[state=unchecked]:bg-primary/30"
                    )}
                  />
                </th>
                <th className="w-8 sticky left-8 bg-slate-100 z-40" />
                {columns.map((column, index) => {
                  // Make privacy (index 0), WO# (index 1), and name (index 2) columns sticky
                  const isSticky = index <= 2;
                  const leftOffset = isSticky 
                    ? index === 0 
                      ? 64  // after checkbox + drag
                      : index === 1
                        ? 96  // after checkbox + drag + privacy (64 + 32)
                        : 224  // after checkbox + drag + privacy + WO# (64 + 32 + 128)
                    : undefined;
                  
                  return (
                    <th 
                      key={column.id}
                      className={cn(
                        "py-2 px-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap bg-slate-100",
                        column.width,
                        isSticky && "sticky z-40",
                        index === 2 && "border-r-2 border-slate-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]"
                      )}
                      style={isSticky ? { left: leftOffset } : undefined}
                    >
                      {column.label}
                    </th>
                  );
                })}
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {group.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onUpdate={(updates) => onUpdateTask(task.id, updates)}
                  onDelete={() => onDeleteTask(task.id)}
                  boardId={boardId}
                  boardName={boardName}
                  workspaceName={workspaceName}
                  onSendToPhase={onSendToPhase ? (phase) => onSendToPhase(task.id, phase) : undefined}
                />
              ))}
            </tbody>
          </table>

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
}
