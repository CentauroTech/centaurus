import { useState } from 'react';
import { Plus, Filter, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Board, TaskGroup as TaskGroupType, Task } from '@/types/board';
import { TaskGroup } from './TaskGroup';

interface BoardViewProps {
  board: Board;
  onBoardUpdate: (board: Board) => void;
}

export function BoardView({ board, onBoardUpdate }: BoardViewProps) {
  const updateTask = (groupId: string, taskId: string, updates: Partial<Task>) => {
    const updatedGroups = board.groups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          tasks: group.tasks.map((task) =>
            task.id === taskId ? { ...task, ...updates, lastUpdated: new Date() } : task
          ),
        };
      }
      return group;
    });
    onBoardUpdate({ ...board, groups: updatedGroups });
  };

  const deleteTask = (groupId: string, taskId: string) => {
    const updatedGroups = board.groups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          tasks: group.tasks.filter((task) => task.id !== taskId),
        };
      }
      return group;
    });
    onBoardUpdate({ ...board, groups: updatedGroups });
  };

  const addTask = (groupId: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: '',
      status: 'default',
      createdAt: new Date(),
    };

    const updatedGroups = board.groups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          tasks: [...group.tasks, newTask],
        };
      }
      return group;
    });
    onBoardUpdate({ ...board, groups: updatedGroups });
  };

  const updateGroup = (groupId: string, updates: Partial<TaskGroupType>) => {
    const updatedGroups = board.groups.map((group) =>
      group.id === groupId ? { ...group, ...updates } : group
    );
    onBoardUpdate({ ...board, groups: updatedGroups });
  };

  const addGroup = () => {
    const colors = [
      'hsl(209, 100%, 46%)',
      'hsl(154, 64%, 45%)',
      'hsl(270, 50%, 60%)',
      'hsl(25, 95%, 53%)',
      'hsl(0, 72%, 51%)',
    ];
    
    const newGroup: TaskGroupType = {
      id: `group-${Date.now()}`,
      name: 'New Group',
      color: colors[board.groups.length % colors.length],
      tasks: [],
    };

    onBoardUpdate({ ...board, groups: [...board.groups, newGroup] });
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="w-4 h-4" />
            Person
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="w-4 h-4" />
            Due date
          </Button>
        </div>

        <Button onClick={addGroup} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          New Group
        </Button>
      </div>

      {/* Scrollable Board Area */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {/* Task Groups */}
        <div className="space-y-6 min-w-max">
          {board.groups.map((group) => (
            <TaskGroup
              key={group.id}
              group={group}
              onUpdateTask={(taskId, updates) => updateTask(group.id, taskId, updates)}
              onDeleteTask={(taskId) => deleteTask(group.id, taskId)}
              onAddTask={() => addTask(group.id)}
              onUpdateGroup={(updates) => updateGroup(group.id, updates)}
            />
          ))}
        </div>

        {/* Empty State */}
        {board.groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">No groups yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first group to start organizing tasks
            </p>
            <Button onClick={addGroup} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Group
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
