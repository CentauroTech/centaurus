export type Status = 'done' | 'working' | 'stuck' | 'waiting' | 'planning' | 'default';
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
  name: string;
  status: Status;
  dateAssigned?: Date;
  branch?: string;
  projectManager?: User;
  clientName?: string;
  entregaMiamiStart?: Date;
  entregaMiamiEnd?: Date;
  entregaMixRetakes?: Date;
  entregaCliente?: Date;
  entregaSesiones?: Date;
  cantidadEpisodios?: number;
  lockedRuntime?: string;
  finalRuntime?: string;
  servicios?: string;
  entregaFinalDubAudio?: Date;
  entregaFinalScript?: Date;
  pruebaDeVoz?: boolean;
  aorNeeded?: boolean;
  formato?: string;
  lenguajeOriginal?: string;
  rates?: number;
  showGuide?: string;
  tituloAprobadoEspanol?: string;
  workOrderNumber?: string;
  fase?: Phase;
  lastUpdated?: Date;
  dontUseStart?: Date;
  dontUseEnd?: Date;
  aorComplete?: boolean;
  director?: User;
  studio?: string;
  tecnico?: User;
  qc1?: User;
  qcRetakes?: Date;
  mixerBogota?: User;
  mixerMiami?: User;
  qcMix?: User;
  traductor?: User;
  adaptador?: User;
  dateDelivered?: Date;
  hq?: string;
  people?: User[];
  phaseDueDate?: Date;
  linkToColHQ?: string;
  rateInfo?: string;
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
  type: 'text' | 'date' | 'person' | 'status' | 'phase' | 'number' | 'boolean' | 'link' | 'people' | 'combobox' | 'dropdown' | 'file' | 'auto' | 'last-updated';
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
  { id: 'name', label: 'Name', type: 'text', width: 'w-64', field: 'name' },
  { id: 'status', label: 'Status', type: 'status', width: 'w-32', field: 'status' },
  { id: 'dateAssigned', label: 'Fecha Asignada', type: 'date', width: 'w-28', field: 'dateAssigned' },
  { id: 'branch', label: 'Sede/Branch', type: 'dropdown', width: 'w-28', field: 'branch', options: BRANCH_OPTIONS },
  { id: 'projectManager', label: 'Project Manager', type: 'person', width: 'w-36', field: 'projectManager' },
  { id: 'clientName', label: 'Nombre Cliente', type: 'combobox', width: 'w-36', field: 'clientName', options: CLIENT_OPTIONS },
  { id: 'entregaMiamiStart', label: 'Entrega Miami - Start', type: 'date', width: 'w-32', field: 'entregaMiamiStart' },
  { id: 'entregaMiamiEnd', label: 'Entrega Miami - End', type: 'date', width: 'w-32', field: 'entregaMiamiEnd' },
  { id: 'entregaMixRetakes', label: 'Entrega Mix Retakes', type: 'date', width: 'w-32', field: 'entregaMixRetakes' },
  { id: 'entregaCliente', label: 'Entrega Cliente', type: 'date', width: 'w-28', field: 'entregaCliente' },
  { id: 'entregaSesiones', label: 'Entrega Sesiones', type: 'date', width: 'w-28', field: 'entregaSesiones' },
  { id: 'cantidadEpisodios', label: 'Cantidad Episodios', type: 'number', width: 'w-24', field: 'cantidadEpisodios' },
  { id: 'lockedRuntime', label: 'Locked Runtime', type: 'text', width: 'w-28', field: 'lockedRuntime' },
  { id: 'finalRuntime', label: 'Final Runtime', type: 'text', width: 'w-28', field: 'finalRuntime' },
  { id: 'servicios', label: 'Servicios', type: 'combobox', width: 'w-36', field: 'servicios', options: SERVICIOS_OPTIONS },
  { id: 'entregaFinalDubAudio', label: 'Entrega Final - Dub Audio', type: 'date', width: 'w-36', field: 'entregaFinalDubAudio' },
  { id: 'entregaFinalScript', label: 'Entrega Final - Script', type: 'date', width: 'w-36', field: 'entregaFinalScript' },
  { id: 'pruebaDeVoz', label: 'Prueba de Voz?', type: 'boolean', width: 'w-24', field: 'pruebaDeVoz' },
  { id: 'aorNeeded', label: 'AOR Needed', type: 'boolean', width: 'w-24', field: 'aorNeeded' },
  { id: 'formato', label: 'Formato', type: 'combobox', width: 'w-32', field: 'formato', options: FORMATO_OPTIONS },
  { id: 'lenguajeOriginal', label: 'Lenguaje Original', type: 'combobox', width: 'w-32', field: 'lenguajeOriginal', options: LENGUAJE_OPTIONS },
  { id: 'rates', label: 'Rates', type: 'number', width: 'w-24', field: 'rates' },
  { id: 'showGuide', label: 'ShowGuide', type: 'file', width: 'w-32', field: 'showGuide' },
  { id: 'tituloAprobadoEspanol', label: 'Titulo Aprobado Español', type: 'combobox', width: 'w-44', field: 'tituloAprobadoEspanol', options: [] },
  { id: 'workOrderNumber', label: 'Work Order #', type: 'auto', width: 'w-28', field: 'workOrderNumber' },
  { id: 'fase', label: 'Fase', type: 'phase', width: 'w-32', field: 'fase' },
  { id: 'lastUpdated', label: 'Last Updated', type: 'last-updated', width: 'w-32', field: 'lastUpdated' },
  { id: 'aorComplete', label: 'AOR Complete', type: 'boolean', width: 'w-24', field: 'aorComplete' },
  { id: 'director', label: 'Director', type: 'person', width: 'w-36', field: 'director' },
  { id: 'studio', label: 'Studio', type: 'text', width: 'w-28', field: 'studio' },
  { id: 'tecnico', label: 'Técnico', type: 'person', width: 'w-36', field: 'tecnico' },
  { id: 'qc1', label: 'QC 1', type: 'person', width: 'w-36', field: 'qc1' },
  { id: 'qcRetakes', label: 'QC Retakes', type: 'date', width: 'w-28', field: 'qcRetakes' },
  { id: 'mixerBogota', label: 'Mixer Bogotá', type: 'person', width: 'w-36', field: 'mixerBogota' },
  { id: 'mixerMiami', label: 'Mixer Miami', type: 'person', width: 'w-36', field: 'mixerMiami' },
  { id: 'qcMix', label: 'QC Mix', type: 'person', width: 'w-36', field: 'qcMix' },
  { id: 'traductor', label: 'Traductor', type: 'person', width: 'w-36', field: 'traductor' },
  { id: 'adaptador', label: 'Adaptador', type: 'person', width: 'w-36', field: 'adaptador' },
  { id: 'dateDelivered', label: 'Date Delivered', type: 'date', width: 'w-28', field: 'dateDelivered' },
  { id: 'hq', label: 'HQ', type: 'text', width: 'w-24', field: 'hq' },
  { id: 'people', label: 'People', type: 'people', width: 'w-40', field: 'people' },
  { id: 'phaseDueDate', label: 'Phase Due Date', type: 'date', width: 'w-28', field: 'phaseDueDate' },
  { id: 'linkToColHQ', label: 'Link to Col-HQ', type: 'link', width: 'w-28', field: 'linkToColHQ' },
  { id: 'rateInfo', label: 'Rate Info', type: 'text', width: 'w-32', field: 'rateInfo' },
];
