import { useState } from 'react';
import { GripVertical, Trash2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, User } from '@/types/board';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { OwnerCell } from './OwnerCell';
import { DateCell } from './DateCell';
import { TaskDetailsPanel } from './TaskDetailsPanel';
import { mockUsers } from '@/data/mockData';

interface TaskRowProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
}

export function TaskRow({ task, onUpdate, onDelete }: TaskRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [taskName, setTaskName] = useState(task.name);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTaskName(e.target.value);
  };

  const handleNameBlur = () => {
    if (taskName !== task.name) {
      onUpdate({ name: taskName });
    }
  };

  const commentCount = task.comments?.length || 0;

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
        <td className="w-8 px-2">
          <div className="opacity-0 group-hover:opacity-100 transition-smooth cursor-grab">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        </td>

        {/* Task Name */}
        <td className="py-2 px-3">
          <input
            type="text"
            value={taskName}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            className="w-full bg-transparent border-0 outline-none text-sm font-medium text-foreground focus:ring-0"
            placeholder="Task name"
          />
        </td>

        {/* Updates Button */}
        <td className="py-2 px-2 w-16">
          <button
            onClick={() => setIsDetailsPanelOpen(true)}
            className={cn(
              "flex items-center justify-center gap-1 p-1.5 rounded hover:bg-accent transition-smooth",
              commentCount > 0 ? "text-primary" : "text-muted-foreground"
            )}
            title="Open updates"
          >
            <MessageSquare className="w-4 h-4" />
            {commentCount > 0 && (
              <span className="text-xs font-medium">{commentCount}</span>
            )}
          </button>
        </td>

        {/* Owner */}
        <td className="py-2 px-3 w-44">
          <OwnerCell
            owner={task.owner}
            onOwnerChange={(owner) => onUpdate({ owner })}
          />
        </td>

        {/* Status */}
        <td className="py-2 px-3 w-36">
          <StatusBadge
            status={task.status}
            onStatusChange={(status) => onUpdate({ status })}
          />
        </td>

        {/* Priority */}
        <td className="py-2 px-3 w-24">
          <PriorityBadge
            priority={task.priority}
            onPriorityChange={(priority) => onUpdate({ priority })}
          />
        </td>

        {/* Due Date */}
        <td className="py-2 px-3 w-32">
          <DateCell
            date={task.dueDate}
            onDateChange={(dueDate) => onUpdate({ dueDate })}
          />
        </td>

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
