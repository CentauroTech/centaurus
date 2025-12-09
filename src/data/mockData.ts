import { Workspace, User, TaskGroup, Status, Priority, Comment, TaskFile, ActivityItem } from '@/types/board';

export const mockUsers: User[] = [
  { id: '1', name: 'Sarah Chen', initials: 'SC', color: 'hsl(209, 100%, 46%)' },
  { id: '2', name: 'Mike Johnson', initials: 'MJ', color: 'hsl(154, 64%, 45%)' },
  { id: '3', name: 'Emily Davis', initials: 'ED', color: 'hsl(270, 50%, 60%)' },
  { id: '4', name: 'Alex Rivera', initials: 'AR', color: 'hsl(25, 95%, 53%)' },
];

// Sample comments for tasks
const sampleComments: Comment[] = [
  {
    id: 'comment-1',
    userId: '1',
    user: mockUsers[0],
    content: 'Just finished the initial setup. @Mike Johnson can you review the color tokens?',
    createdAt: new Date('2024-12-10T10:30:00'),
    mentions: ['2'],
    reactions: [{ emoji: '👍', userIds: ['2', '3'] }],
  },
  {
    id: 'comment-2',
    userId: '2',
    user: mockUsers[1],
    content: 'Looks great! I made some suggestions in the Figma file.',
    createdAt: new Date('2024-12-10T14:15:00'),
    reactions: [{ emoji: '🎉', userIds: ['1'] }],
  },
  {
    id: 'comment-3',
    userId: '3',
    user: mockUsers[2],
    content: 'Here are the updated mockups for the dashboard 🎨',
    createdAt: new Date('2024-12-11T09:00:00'),
    attachments: [
      {
        id: 'file-inline-1',
        name: 'dashboard-v2.png',
        url: '/files/dashboard-v2.png',
        type: 'image',
        size: 245000,
        uploadedBy: mockUsers[2],
        uploadedAt: new Date('2024-12-11T09:00:00'),
      },
    ],
  },
];

// Sample files for tasks
const sampleFiles: TaskFile[] = [
  {
    id: 'file-1',
    name: 'design-system.pdf',
    url: '/files/design-system.pdf',
    type: 'document',
    size: 1240000,
    uploadedBy: mockUsers[0],
    uploadedAt: new Date('2024-12-05T11:00:00'),
  },
  {
    id: 'file-2',
    name: 'brand-colors.png',
    url: '/files/brand-colors.png',
    type: 'image',
    size: 89000,
    uploadedBy: mockUsers[0],
    uploadedAt: new Date('2024-12-06T15:30:00'),
  },
  {
    id: 'file-3',
    name: 'component-specs.docx',
    url: '/files/component-specs.docx',
    type: 'document',
    size: 567000,
    uploadedBy: mockUsers[2],
    uploadedAt: new Date('2024-12-08T10:00:00'),
  },
];

// Sample activity for tasks
const sampleActivity: ActivityItem[] = [
  {
    id: 'activity-1',
    type: 'created',
    userId: '1',
    user: mockUsers[0],
    timestamp: new Date('2024-12-01T09:00:00'),
    details: {},
  },
  {
    id: 'activity-2',
    type: 'status_change',
    userId: '1',
    user: mockUsers[0],
    timestamp: new Date('2024-12-05T14:30:00'),
    details: { field: 'status', oldValue: 'Not started', newValue: 'Working on it' },
  },
  {
    id: 'activity-3',
    type: 'file_upload',
    userId: '1',
    user: mockUsers[0],
    timestamp: new Date('2024-12-05T15:00:00'),
    details: { fileName: 'design-system.pdf' },
  },
  {
    id: 'activity-4',
    type: 'owner_change',
    userId: '2',
    user: mockUsers[1],
    timestamp: new Date('2024-12-08T10:00:00'),
    details: { field: 'owner', oldValue: undefined, newValue: 'Sarah Chen' },
  },
  {
    id: 'activity-5',
    type: 'status_change',
    userId: '1',
    user: mockUsers[0],
    timestamp: new Date('2024-12-10T16:00:00'),
    details: { field: 'status', oldValue: 'Working on it', newValue: 'Done' },
  },
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
        comments: sampleComments,
        files: sampleFiles,
        activity: sampleActivity,
      },
      {
        id: 'task-2',
        name: 'User authentication flow',
        status: 'working',
        priority: 'high',
        owner: mockUsers[1],
        dueDate: new Date('2024-12-20'),
        createdAt: new Date('2024-12-02'),
        comments: [sampleComments[0]],
        activity: [sampleActivity[0], sampleActivity[1]],
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
