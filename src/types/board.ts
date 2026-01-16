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
  servicios?: string[];
  genre?: string;
  entregaFinalDubAudio?: Date | string;
  entregaFinalScript?: Date | string;
  entregaFinalScriptItems?: string[];
  entregaFinalDubAudioItems?: string[];
  pruebaDeVoz?: boolean;
  aorNeeded?: boolean;
  formato?: string[];
  lenguajeOriginal?: string;
  targetLanguage?: string;
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
  type: 'text' | 'date' | 'person' | 'status' | 'phase' | 'current-phase' | 'number' | 'boolean' | 'link' | 'people' | 'combobox' | 'dropdown' | 'file' | 'auto' | 'last-updated' | 'privacy' | 'multi-select';
  width: string;
  field: keyof Task;
  options?: string[];
}

// Dropdown options for various fields
export const BRANCH_OPTIONS = ['Colombia', 'Miami', 'Brazil', 'Mexico'];
export const CLIENT_OPTIONS = ['Netflix', 'Amazon', 'Disney+', 'HBO Max', 'Apple TV+', 'Paramount+'];
export const SERVICIOS_OPTIONS = [
  'Audio Description AD',
  'Audiobook',
  'BWAV ADM',
  'Casting',
  'Casting Only',
  'Closed Captioning',
  'Conformance',
  'Creation of Original Voices',
  'Dubbing',
  'Dubbing Lip Sync',
  'Dubbing of Songs',
  'Edición de Audio',
  'Foley',
  'M&E',
  'Gráficas',
  'Guide Track Recording',
  'Localization',
  'Mix 2.0',
  'Mix Atmos',
  'Mix Dobly Atmos',
  'Revisión de Dialogo',
  'Subtitles',
  'Subtitling',
  'Voice Over',
];
export const FORMATO_OPTIONS = ['Feature Film', 'Series', 'Documentary', 'Short Film', 'Animation'];
export const LENGUAJE_OPTIONS = ['English', 'Spanish', 'Portuguese', 'French', 'German', 'Italian', 'Japanese', 'Korean', 'Mandarin'];
export const GENRE_OPTIONS = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Family',
  'Kids',
  'Horror',
  'Musical',
  'Reality',
  'Fantasy',
];

export const ENTREGA_FINAL_SCRIPT_OPTIONS = [
  '5.0 Dx',
  'AD Script',
  'Dub Card - Netflix Portal',
  'Dub Card - Image',
  'Dub Card - Mpg',
  'Dub Card - Png',
  'Dub Card - Tiff',
  'Forced Narratives XML',
  'Forced Narratives STL',
  'List of Forced Narratives',
  'Metadata Traducción',
  'Mix 5.1',
  'Mix Stereo 2.0',
  'Subtitles XML',
  'Subtitles SRT',
  'Translated Script'
];

export const ENTREGA_FINAL_DUB_AUDIO_OPTIONS = [
  'AIFFF Files',
  'Archivos .wav Individuales',
  'Audios en Wav en Mono',
  'BWAV ADM',
  'Dialogue Stems',
  'Foley',
  'Lip Sync',
  'M&E',
  'Protools + Metadata',
  'Protools Sessions (Only Voices no Premix)',
  'Ver Kickoff Instructions'
];

export const TARGET_LANGUAGE_OPTIONS = ['English', 'Spanish (Latin America)', 'Spanish (Spain)', 'Portuguese (Brazil)', 'Portuguese (Portugal)', 'French', 'German', 'Italian', 'Japanese', 'Korean', 'Mandarin', 'Cantonese'];

export const COLUMNS: ColumnConfig[] = [
  { id: 'isPrivate', label: '', type: 'privacy', width: 'w-8', field: 'isPrivate' },
  { id: 'name', label: 'Project Name', type: 'text', width: 'w-56', field: 'name' },
  { id: 'projectManager', label: 'PM', type: 'person', width: 'w-28', field: 'projectManager' },
  { id: 'clientName', label: 'Client', type: 'combobox', width: 'w-32', field: 'clientName', options: CLIENT_OPTIONS },
  { id: 'cantidadEpisodios', label: 'Episodes', type: 'number', width: 'w-20', field: 'cantidadEpisodios' },
  { id: 'entregaCliente', label: 'Client Due', type: 'date', width: 'w-28', field: 'entregaCliente' },
  { id: 'lockedRuntime', label: 'Runtime', type: 'text', width: 'w-20', field: 'lockedRuntime' },
  { id: 'people', label: 'People', type: 'people', width: 'w-32', field: 'people' },
  { id: 'currentPhase', label: 'Phase', type: 'current-phase', width: 'w-24', field: 'currentPhase' },
  { id: 'phaseDueDate', label: 'Phase Due', type: 'date', width: 'w-28', field: 'phaseDueDate' },
  { id: 'dateAssigned', label: 'Assigned', type: 'date', width: 'w-28', field: 'dateAssigned' },
  { id: 'dateDelivered', label: 'Delivered', type: 'date', width: 'w-28', field: 'dateDelivered' },
  { id: 'status', label: 'Status', type: 'status', width: 'w-28', field: 'status' },
  { id: 'lastUpdated', label: 'Updated', type: 'last-updated', width: 'w-28', field: 'lastUpdated' },
  { id: 'premixRetakeList', label: 'Premix Retakes', type: 'file', width: 'w-28', field: 'premixRetakeList' },
  { id: 'mixRetakeList', label: 'Mix Retakes', type: 'file', width: 'w-28', field: 'mixRetakeList' },
  { id: 'aorNeeded', label: 'AOR', type: 'boolean', width: 'w-16', field: 'aorNeeded' },
  { id: 'traductor', label: 'Translator', type: 'person', width: 'w-28', field: 'traductor' },
  { id: 'adaptador', label: 'Adapter', type: 'person', width: 'w-28', field: 'adaptador' },
  { id: 'premix', label: 'Premix', type: 'person', width: 'w-28', field: 'mixerBogota' },
  { id: 'qcPremix', label: 'QC Premix', type: 'person', width: 'w-28', field: 'qc1' },
  { id: 'qcRetakes', label: 'QC Retakes', type: 'person', width: 'w-28', field: 'qcRetakes' },
  { id: 'mixer', label: 'Mixer', type: 'person', width: 'w-28', field: 'mixerMiami' },
  { id: 'qcMix', label: 'QC Mix', type: 'person', width: 'w-28', field: 'qcMix' },
  { id: 'lenguajeOriginal', label: 'Original Language', type: 'dropdown', width: 'w-32', field: 'lenguajeOriginal', options: LENGUAJE_OPTIONS },
  { id: 'targetLanguage', label: 'Target Language', type: 'dropdown', width: 'w-32', field: 'targetLanguage', options: TARGET_LANGUAGE_OPTIONS },
  { id: 'tituloAprobadoEspanol', label: 'Approved Title', type: 'text', width: 'w-40', field: 'tituloAprobadoEspanol' },
  { id: 'servicios', label: 'Services', type: 'multi-select', width: 'w-56', field: 'servicios', options: SERVICIOS_OPTIONS },
  { id: 'formato', label: 'Format', type: 'multi-select', width: 'w-44', field: 'formato', options: FORMATO_OPTIONS },
  { id: 'branch', label: 'Branch', type: 'dropdown', width: 'w-24', field: 'branch', options: BRANCH_OPTIONS },
  { id: 'genre', label: 'Genre', type: 'dropdown', width: 'w-24', field: 'genre', options: GENRE_OPTIONS },
  { id: 'entregaFinalScriptItems', label: 'Entrega Script/Dubcard', type: 'multi-select', width: 'w-80', field: 'entregaFinalScriptItems', options: ENTREGA_FINAL_SCRIPT_OPTIONS },
  { id: 'entregaFinalDubAudioItems', label: 'Entrega Dub Audio', type: 'multi-select', width: 'w-80', field: 'entregaFinalDubAudioItems', options: ENTREGA_FINAL_DUB_AUDIO_OPTIONS },
];
