export type Status = 'done' | 'working' | 'stuck' | 'waiting' | 'planning' | 'default';
export type Priority = 'high' | 'medium' | 'low';

export interface User {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  color: string;
}

export interface Task {
  id: string;
  name: string;
  status: Status;
  priority: Priority;
  owner?: User;
  dueDate?: Date;
  createdAt: Date;
}

export interface TaskGroup {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
  isCollapsed?: boolean;
}

export interface Board {
  id: string;
  name: string;
  icon?: string;
  groups: TaskGroup[];
}

export interface Workspace {
  id: string;
  name: string;
  boards: Board[];
}

export const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  done: { label: 'Done', className: 'bg-status-done text-white' },
  working: { label: 'Working on it', className: 'bg-status-working text-foreground' },
  stuck: { label: 'Stuck', className: 'bg-status-stuck text-white' },
  waiting: { label: 'Waiting', className: 'bg-status-waiting text-white' },
  planning: { label: 'Planning', className: 'bg-status-planning text-white' },
  default: { label: 'Not started', className: 'bg-status-default text-white' },
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-priority-high text-white' },
  medium: { label: 'Medium', className: 'bg-priority-medium text-white' },
  low: { label: 'Low', className: 'bg-priority-low text-white' },
};
