export type Status = 'done' | 'working' | 'stuck' | 'waiting' | 'planning' | 'default';
export type Priority = 'high' | 'medium' | 'low';

export interface User {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  color: string;
}

export interface Comment {
  id: string;
  userId: string;
  user: User;
  content: string;
  createdAt: Date;
  attachments?: TaskFile[];
  mentions?: string[];
  reactions?: { emoji: string; userIds: string[] }[];
}

export interface TaskFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document' | 'video' | 'other';
  size: number;
  uploadedBy: User;
  uploadedAt: Date;
}

export interface ActivityItem {
  id: string;
  type: 'created' | 'status_change' | 'priority_change' | 'owner_change' | 'due_date_change' | 'name_change' | 'comment' | 'file_upload';
  userId: string;
  user: User;
  timestamp: Date;
  details: {
    field?: string;
    oldValue?: string;
    newValue?: string;
    fileName?: string;
    commentPreview?: string;
  };
}

export interface Task {
  id: string;
  name: string;
  status: Status;
  priority: Priority;
  owner?: User;
  dueDate?: Date;
  createdAt: Date;
  comments?: Comment[];
  files?: TaskFile[];
  activity?: ActivityItem[];
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
