import { Workspace, User, TaskGroup, Status, Priority } from '@/types/board';

export const mockUsers: User[] = [
  { id: '1', name: 'Sarah Chen', initials: 'SC', color: 'hsl(209, 100%, 46%)' },
  { id: '2', name: 'Mike Johnson', initials: 'MJ', color: 'hsl(154, 64%, 45%)' },
  { id: '3', name: 'Emily Davis', initials: 'ED', color: 'hsl(270, 50%, 60%)' },
  { id: '4', name: 'Alex Rivera', initials: 'AR', color: 'hsl(25, 95%, 53%)' },
];

export const mockTaskGroups: TaskGroup[] = [
  {
    id: 'group-1',
    name: 'Sprint 1 - Core Features',
    color: 'hsl(209, 100%, 46%)',
    tasks: [
      {
        id: 'task-1',
        name: 'Design system setup',
        status: 'done',
        priority: 'high',
        owner: mockUsers[0],
        dueDate: new Date('2024-12-15'),
        createdAt: new Date('2024-12-01'),
      },
      {
        id: 'task-2',
        name: 'User authentication flow',
        status: 'working',
        priority: 'high',
        owner: mockUsers[1],
        dueDate: new Date('2024-12-20'),
        createdAt: new Date('2024-12-02'),
      },
      {
        id: 'task-3',
        name: 'Dashboard wireframes',
        status: 'done',
        priority: 'medium',
        owner: mockUsers[2],
        dueDate: new Date('2024-12-10'),
        createdAt: new Date('2024-12-01'),
      },
      {
        id: 'task-4',
        name: 'API integration planning',
        status: 'waiting',
        priority: 'medium',
        owner: mockUsers[3],
        dueDate: new Date('2024-12-25'),
        createdAt: new Date('2024-12-05'),
      },
    ],
  },
  {
    id: 'group-2',
    name: 'Sprint 2 - Enhancements',
    color: 'hsl(154, 64%, 45%)',
    tasks: [
      {
        id: 'task-5',
        name: 'Performance optimization',
        status: 'planning',
        priority: 'low',
        owner: mockUsers[0],
        dueDate: new Date('2025-01-05'),
        createdAt: new Date('2024-12-10'),
      },
      {
        id: 'task-6',
        name: 'Mobile responsive design',
        status: 'stuck',
        priority: 'high',
        owner: mockUsers[2],
        dueDate: new Date('2024-12-28'),
        createdAt: new Date('2024-12-08'),
      },
      {
        id: 'task-7',
        name: 'Unit testing setup',
        status: 'default',
        priority: 'medium',
        dueDate: new Date('2025-01-10'),
        createdAt: new Date('2024-12-12'),
      },
    ],
  },
  {
    id: 'group-3',
    name: 'Backlog',
    color: 'hsl(270, 50%, 60%)',
    tasks: [
      {
        id: 'task-8',
        name: 'Documentation update',
        status: 'default',
        priority: 'low',
        createdAt: new Date('2024-12-15'),
      },
      {
        id: 'task-9',
        name: 'Analytics integration',
        status: 'default',
        priority: 'medium',
        createdAt: new Date('2024-12-15'),
      },
    ],
  },
];

export const mockWorkspaces: Workspace[] = [
  {
    id: 'ws-1',
    name: 'Main Workspace',
    boards: [
      {
        id: 'board-1',
        name: 'Project Alpha',
        icon: '🚀',
        groups: mockTaskGroups,
      },
      {
        id: 'board-2',
        name: 'Marketing Campaign',
        icon: '📈',
        groups: [],
      },
      {
        id: 'board-3',
        name: 'Bug Tracker',
        icon: '🐛',
        groups: [],
      },
    ],
  },
  {
    id: 'ws-2',
    name: 'Personal',
    boards: [
      {
        id: 'board-4',
        name: 'Side Projects',
        icon: '💡',
        groups: [],
      },
    ],
  },
];
