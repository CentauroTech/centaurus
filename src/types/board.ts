export type Status = 'done' | 'launch' | 'working' | 'stuck' | 'waiting' | 'planning' | 'default';
export type Priority = 'high' | 'medium' | 'low';
export type Phase = 'pre_production' | 'production' | 'post_production' | 'delivery' | 'complete';

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
  groupId?: string; // Original group_id from database (needed for HQ phase progression)
  name: string;
  status: Status;
  isPrivate?: boolean;
  commentCount?: number;
  dateAssigned?: Date | string;
  branch?: string;
  projectManager?: User;
  clientName?: string;
  entregaMiamiStart?: Date | string;
  entregaMiamiEnd?: Date | string;
  entregaMixRetakes?: Date | string;
  entregaCliente?: Date | string;
  entregaSesiones?: Date | string;
  cantidadEpisodios?: number;
  lockedRuntime?: string;
  finalRuntime?: string;
  servicios?: string;
  entregaFinalDubAudio?: Date | string;
  entregaFinalScript?: Date | string;
  pruebaDeVoz?: boolean;
  aorNeeded?: boolean;
  formato?: string;
  lenguajeOriginal?: string;
  rates?: number;
  showGuide?: string;
  tituloAprobadoEspanol?: string;
  workOrderNumber?: string;
  fase?: Phase;
  currentPhase?: string; // Dynamic phase derived from current board (for HQ view)
  lastUpdated?: Date;
  dontUseStart?: Date | string;
  dontUseEnd?: Date | string;
  aorComplete?: boolean;
  director?: User;
  studio?: string;
  tecnico?: User;
  qc1?: User;
  qcRetakes?: User;
  mixerBogota?: User;
  mixerMiami?: User;
  qcMix?: User;
  traductor?: User;
  adaptador?: User;
  dateDelivered?: Date | string;
  hq?: string;
  people?: User[];
  phaseDueDate?: Date | string;
  linkToColHQ?: string;
  rateInfo?: string;
  premixRetakeList?: string;
  mixRetakeList?: string;
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
  launch: { label: 'Launch', className: 'bg-status-done text-white' },
  working: { label: 'Working on it', className: 'bg-status-working text-foreground' },
  stuck: { label: 'Stuck', className: 'bg-status-stuck text-white' },
  waiting: { label: 'Waiting', className: 'bg-status-waiting text-white' },
  planning: { label: 'Planning', className: 'bg-status-planning text-white' },
  default: { label: 'Not started', className: 'bg-status-default text-white' },
};

export const PHASE_CONFIG: Record<Phase, { label: string; className: string }> = {
  pre_production: { label: 'Pre-Production', className: 'bg-purple-500 text-white' },
  production: { label: 'Production', className: 'bg-blue-500 text-white' },
  post_production: { label: 'Post-Production', className: 'bg-orange-500 text-white' },
  delivery: { label: 'Delivery', className: 'bg-yellow-500 text-foreground' },
  complete: { label: 'Complete', className: 'bg-status-done text-white' },
};

export interface ColumnConfig {
  id: string;
  label: string;
  type: 'text' | 'date' | 'person' | 'status' | 'phase' | 'current-phase' | 'number' | 'boolean' | 'link' | 'people' | 'combobox' | 'dropdown' | 'file' | 'auto' | 'last-updated' | 'privacy';
  width: string;
  field: keyof Task;
  options?: string[];
}

// Dropdown options for various fields
export const BRANCH_OPTIONS = ['Miami', 'Colombia', 'Mexico', 'Argentina', 'Spain'];
export const CLIENT_OPTIONS = ['Netflix', 'Amazon', 'Disney+', 'HBO Max', 'Apple TV+', 'Paramount+'];
export const SERVICIOS_OPTIONS = ['Dubbing', 'Subtitling', 'Voice Over', 'Audio Description', 'Localization'];
export const FORMATO_OPTIONS = ['Feature Film', 'Series', 'Documentary', 'Short Film', 'Animation'];
export const LENGUAJE_OPTIONS = ['English', 'Spanish', 'Portuguese', 'French', 'German', 'Italian', 'Japanese', 'Korean', 'Mandarin'];

export const COLUMNS: ColumnConfig[] = [
  { id: 'isPrivate', label: '', type: 'privacy', width: 'w-10', field: 'isPrivate' },
  { id: 'name', label: 'Project Name', type: 'text', width: 'w-64', field: 'name' },
  { id: 'projectManager', label: 'Project Manager', type: 'person', width: 'w-36', field: 'projectManager' },
  { id: 'clientName', label: 'Client Name', type: 'combobox', width: 'w-36', field: 'clientName', options: CLIENT_OPTIONS },
  { id: 'cantidadEpisodios', label: 'Total Show Episodes', type: 'number', width: 'w-28', field: 'cantidadEpisodios' },
  { id: 'entregaCliente', label: 'Client Due Date', type: 'date', width: 'w-28', field: 'entregaCliente' },
  { id: 'lockedRuntime', label: 'Runtime', type: 'text', width: 'w-28', field: 'lockedRuntime' },
  { id: 'people', label: 'People', type: 'people', width: 'w-40', field: 'people' },
  { id: 'currentPhase', label: 'Phase', type: 'current-phase', width: 'w-28', field: 'currentPhase' },
  { id: 'phaseDueDate', label: 'Phase Due Date', type: 'date', width: 'w-28', field: 'phaseDueDate' },
  { id: 'dateAssigned', label: 'Date Assigned', type: 'date', width: 'w-32', field: 'dateAssigned' },
  { id: 'dateDelivered', label: 'Date Delivered', type: 'date', width: 'w-32', field: 'dateDelivered' },
  { id: 'status', label: 'Status', type: 'status', width: 'w-32', field: 'status' },
  { id: 'lastUpdated', label: 'Last Updated', type: 'last-updated', width: 'w-32', field: 'lastUpdated' },
  { id: 'premixRetakeList', label: 'Premix Retake List', type: 'file', width: 'w-32', field: 'premixRetakeList' },
  { id: 'mixRetakeList', label: 'Mix Retake List', type: 'file', width: 'w-32', field: 'mixRetakeList' },
  { id: 'aorNeeded', label: 'AOR Needed', type: 'boolean', width: 'w-24', field: 'aorNeeded' },
  { id: 'traductor', label: 'Translator', type: 'person', width: 'w-36', field: 'traductor' },
  { id: 'adaptador', label: 'Adapter', type: 'person', width: 'w-36', field: 'adaptador' },
  { id: 'premix', label: 'Premix', type: 'person', width: 'w-36', field: 'mixerBogota' },
  { id: 'qcPremix', label: 'QC Premix', type: 'person', width: 'w-36', field: 'qc1' },
  { id: 'qcRetakes', label: 'QC Retakes', type: 'person', width: 'w-36', field: 'qcRetakes' },
  { id: 'mixer', label: 'Mixer', type: 'person', width: 'w-36', field: 'mixerMiami' },
  { id: 'qcMix', label: 'QC Mix', type: 'person', width: 'w-36', field: 'qcMix' },
  { id: 'servicios', label: 'Services', type: 'combobox', width: 'w-36', field: 'servicios', options: SERVICIOS_OPTIONS },
  { id: 'formato', label: 'Format', type: 'combobox', width: 'w-32', field: 'formato', options: FORMATO_OPTIONS },
  { id: 'branch', label: 'Branch', type: 'dropdown', width: 'w-28', field: 'branch', options: BRANCH_OPTIONS },
];
