export type Status = 'done' | 'launch' | 'working' | 'delayed' | 'default';
export type Priority = 'high' | 'medium' | 'low';
export type Phase = 'on_hold' | 'kickoff' | 'assets' | 'translation' | 'adapting' | 'casting' | 'recording' | 'premix' | 'qc_premix' | 'retakes' | 'qc_retakes' | 'client_retakes' | 'mix' | 'qc_mix' | 'mix_retakes' | 'final_delivery';

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
  studioAssigned?: Date | string;
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
  pruebaDeVoz?: string;
  aorNeeded?: boolean;
  formato?: string[];
  lenguajeOriginal?: string;
  targetLanguage?: string[];
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
  // Timer tracking fields
  startedAt?: Date | string;
  completedAt?: Date | string;
  // Guest-specific fields
  guestDueDate?: Date | string;
  deliveryComment?: string;
  // Kickoff brief
  kickoffBrief?: string;
  kickoff_brief?: string;
  // Computed: 1-based position within its group (for episode display)
  episodeIndex?: number;
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
  delayed: { label: 'Delayed', className: 'bg-status-stuck text-white' },
  default: { label: 'Not started', className: 'bg-status-default text-white' },
};

export const PHASE_CONFIG: Record<Phase, { label: string; className: string }> = {
  on_hold: { label: 'On Hold', className: 'bg-gray-400 text-gray-800' },
  kickoff: { label: 'Kickoff', className: 'bg-gray-900 text-white' },
  assets: { label: 'Assets', className: 'bg-cyan-200 text-cyan-800' },
  translation: { label: 'Translation', className: 'bg-blue-200 text-blue-800' },
  adapting: { label: 'Adapting', className: 'bg-teal-500 text-white' },
  casting: { label: 'Casting', className: 'bg-yellow-400 text-yellow-900' },
  recording: { label: 'Recording', className: 'bg-red-800 text-white' },
  premix: { label: 'Premix', className: 'bg-pink-200 text-pink-800' },
  qc_premix: { label: 'QC-Premix', className: 'bg-purple-200 text-purple-800' },
  retakes: { label: 'Retakes', className: 'bg-purple-600 text-white' },
  qc_retakes: { label: 'QC-Retakes', className: 'bg-amber-200 text-amber-800' },
  client_retakes: { label: 'Client Retakes', className: 'bg-amber-700 text-white' },
  mix: { label: 'Mix', className: 'bg-blue-300 text-blue-900' },
  qc_mix: { label: 'QC-Mix', className: 'bg-purple-300 text-purple-900' },
  mix_retakes: { label: 'Mix Retakes', className: 'bg-pink-500 text-white' },
  final_delivery: { label: 'Final Delivery', className: 'bg-green-500 text-white' },
};

export interface ColumnConfig {
  id: string;
  label: string;
  type: 'text' | 'date' | 'person' | 'status' | 'phase' | 'current-phase' | 'number' | 'boolean' | 'link' | 'people' | 'combobox' | 'dropdown' | 'file' | 'auto' | 'last-updated' | 'privacy' | 'multi-select' | 'time-tracked';
  width: string;
  field: keyof Task;
  options?: string[];
  adminOnly?: boolean; // If true, only admins can see this column
  roleFilter?: 'translator' | 'adapter' | 'premix' | 'mixer' | 'qc_premix' | 'qc_retakes' | 'qc_mix' | 'director' | 'tecnico'; // Filter team members by role
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

export const VOICE_TEST_OPTIONS = ['Yes', 'No', 'Voice Bank'];

export const STUDIO_OPTIONS = ['Studio A', 'Studio B', 'Studio C', 'External'];
export const STUDIO_OPTIONS_MIAMI = ['Studio 2', 'Studio 3', 'Studio 4'];

// Columns that team members (non-PM) can edit after kickoff
export const TEAM_MEMBER_EDITABLE_COLUMNS = [
  'lockedRuntime',
  'finalRuntime',
  'phaseDueDate',
  'premixRetakeList',
  'mixRetakeList',
  'aorNeeded',
  'pruebaDeVoz',
  'traductor',
  'adaptador',
  'mixerBogota',    // premix
  'qc1',            // qcPremix
  'qcRetakes',
  'mixerMiami',     // mixer
  'qcMix',
  'studio',
  'director',
];

export const COLUMNS: ColumnConfig[] = [
  { id: 'isPrivate', label: '', type: 'privacy', width: 'w-8', field: 'isPrivate' },
  { id: 'name', label: 'Project Name', type: 'text', width: 'w-96', field: 'name' },
  { id: 'workOrderNumber', label: 'WO#', type: 'text', width: 'w-32', field: 'workOrderNumber' },
  { id: 'studioAssigned', label: 'Studio Assigned', type: 'date', width: 'w-28', field: 'studioAssigned' },
  { id: 'dateAssigned', label: 'Date Assigned', type: 'date', width: 'w-28', field: 'dateAssigned' },
  { id: 'projectManager', label: 'Project Manager', type: 'person', width: 'w-32', field: 'projectManager' },
  { id: 'clientName', label: 'Client', type: 'combobox', width: 'w-32', field: 'clientName', options: CLIENT_OPTIONS },
  { id: 'cantidadEpisodios', label: 'Episodes', type: 'number', width: 'w-20', field: 'cantidadEpisodios' },
  { id: 'entregaCliente', label: 'Client Due Date', type: 'date', width: 'w-28', field: 'entregaCliente' },
  { id: 'entregaMiamiEnd', label: 'Miami Due Date', type: 'date', width: 'w-28', field: 'entregaMiamiEnd' },
  { id: 'lockedRuntime', label: 'Locked Runtime', type: 'text', width: 'w-24', field: 'lockedRuntime' },
  { id: 'finalRuntime', label: 'Final Runtime', type: 'text', width: 'w-24', field: 'finalRuntime' },
  { id: 'people', label: 'People', type: 'people', width: 'w-32', field: 'people' },
  { id: 'currentPhase', label: 'Phase', type: 'current-phase', width: 'w-32', field: 'currentPhase' },
  { id: 'phaseDueDate', label: 'Phase Due Date', type: 'date', width: 'w-28', field: 'phaseDueDate' },
  { id: 'status', label: 'Status', type: 'status', width: 'w-32', field: 'status' },
  { id: 'dateDelivered', label: 'Delivered', type: 'date', width: 'w-28', field: 'dateDelivered' },
  { id: 'lastUpdated', label: 'Updated', type: 'last-updated', width: 'w-28', field: 'lastUpdated' },
  { id: 'studio', label: 'Studio', type: 'dropdown', width: 'w-28', field: 'studio', options: STUDIO_OPTIONS },
  { id: 'director', label: 'Director', type: 'person', width: 'w-28', field: 'director', roleFilter: 'director' },
  { id: 'lenguajeOriginal', label: 'Original Language', type: 'dropdown', width: 'w-32', field: 'lenguajeOriginal', options: LENGUAJE_OPTIONS },
  { id: 'targetLanguage', label: 'Target Language', type: 'multi-select', width: 'w-48', field: 'targetLanguage', options: TARGET_LANGUAGE_OPTIONS },
  { id: 'tituloAprobadoEspanol', label: 'Approved Title', type: 'text', width: 'w-40', field: 'tituloAprobadoEspanol' },
  { id: 'premixRetakeList', label: 'Premix Retakes', type: 'file', width: 'w-28', field: 'premixRetakeList' },
  { id: 'mixRetakeList', label: 'Mix Retakes', type: 'file', width: 'w-28', field: 'mixRetakeList' },
  { id: 'aorNeeded', label: 'Aor', type: 'boolean', width: 'w-16', field: 'aorNeeded' },
  { id: 'pruebaDeVoz', label: 'Voice Test', type: 'dropdown', width: 'w-24', field: 'pruebaDeVoz', options: VOICE_TEST_OPTIONS },
  { id: 'traductor', label: 'Translator', type: 'person', width: 'w-28', field: 'traductor', roleFilter: 'translator' },
  { id: 'adaptador', label: 'Adapter', type: 'person', width: 'w-28', field: 'adaptador', roleFilter: 'adapter' },
  { id: 'premix', label: 'Premix', type: 'person', width: 'w-28', field: 'mixerBogota', roleFilter: 'premix' },
  { id: 'qcPremix', label: 'QC Premix', type: 'person', width: 'w-28', field: 'qc1', roleFilter: 'qc_premix' },
  { id: 'qcRetakes', label: 'QC Retakes', type: 'person', width: 'w-28', field: 'qcRetakes', roleFilter: 'qc_retakes' },
  { id: 'mixer', label: 'Mixer', type: 'person', width: 'w-28', field: 'mixerMiami', roleFilter: 'mixer' },
  { id: 'qcMix', label: 'QC Mix', type: 'person', width: 'w-28', field: 'qcMix', roleFilter: 'qc_mix' },
  { id: 'formato', label: 'Format', type: 'multi-select', width: 'w-56', field: 'formato', options: FORMATO_OPTIONS },
  { id: 'branch', label: 'Branch', type: 'dropdown', width: 'w-24', field: 'branch', options: BRANCH_OPTIONS },
  { id: 'genre', label: 'Genre', type: 'dropdown', width: 'w-24', field: 'genre', options: GENRE_OPTIONS },
  { id: 'servicios', label: 'Services', type: 'multi-select', width: 'w-72', field: 'servicios', options: SERVICIOS_OPTIONS },
  { id: 'entregaFinalScriptItems', label: 'Entrega Script/Dubcard', type: 'multi-select', width: 'w-96', field: 'entregaFinalScriptItems', options: ENTREGA_FINAL_SCRIPT_OPTIONS },
  { id: 'entregaFinalDubAudioItems', label: 'Entrega Dub Audio', type: 'multi-select', width: 'w-96', field: 'entregaFinalDubAudioItems', options: ENTREGA_FINAL_DUB_AUDIO_OPTIONS },
  { id: 'timeTracked', label: 'Time', type: 'time-tracked', width: 'w-24', field: 'startedAt', adminOnly: true },
];

export const COLUMNS_COLOMBIA: ColumnConfig[] = [
  { id: 'isPrivate', label: '', type: 'privacy', width: 'w-8', field: 'isPrivate' },
  { id: 'name', label: 'Project Name', type: 'text', width: 'w-96', field: 'name' },
  { id: 'workOrderNumber', label: 'WO#', type: 'text', width: 'w-32', field: 'workOrderNumber' },
  { id: 'projectManager', label: 'Project Manager', type: 'person', width: 'w-32', field: 'projectManager' },
  { id: 'clientName', label: 'Cliente', type: 'combobox', width: 'w-32', field: 'clientName', options: CLIENT_OPTIONS },
  { id: 'entregaCliente', label: 'Entrega Cliente', type: 'date', width: 'w-28', field: 'entregaCliente' },
  { id: 'entregaMiamiEnd', label: 'Entrega Miami', type: 'date', width: 'w-28', field: 'entregaMiamiEnd' },
  { id: 'entregaSesiones', label: 'Entrega Sesiones', type: 'date', width: 'w-28', field: 'entregaSesiones' },
  { id: 'entregaMixRetakes', label: 'Entrega Mix Retakes', type: 'date', width: 'w-32', field: 'entregaMixRetakes' },
  { id: 'people', label: 'People', type: 'people', width: 'w-32', field: 'people' },
  { id: 'currentPhase', label: 'Fase', type: 'current-phase', width: 'w-32', field: 'currentPhase' },
  { id: 'status', label: 'Status', type: 'status', width: 'w-32', field: 'status' },
  { id: 'timeTracked', label: 'Time', type: 'time-tracked', width: 'w-24', field: 'startedAt', adminOnly: true },
  { id: 'studio', label: 'Studio', type: 'dropdown', width: 'w-28', field: 'studio', options: STUDIO_OPTIONS },
  { id: 'director', label: 'Director', type: 'person', width: 'w-28', field: 'director', roleFilter: 'director' },
  { id: 'tecnico', label: 'Tecnico', type: 'person', width: 'w-28', field: 'tecnico', roleFilter: 'tecnico' },
  { id: 'lockedRuntime', label: 'Locked Runtime', type: 'text', width: 'w-28', field: 'lockedRuntime' },
  { id: 'finalRuntime', label: 'Final Runtime', type: 'text', width: 'w-24', field: 'finalRuntime' },
  { id: 'pruebaDeVoz', label: 'Prueba de Voz', type: 'dropdown', width: 'w-24', field: 'pruebaDeVoz', options: VOICE_TEST_OPTIONS },
  { id: 'aorNeeded', label: 'Aor', type: 'boolean', width: 'w-16', field: 'aorNeeded' },
  { id: 'tituloAprobadoEspanol', label: 'Titulo Aprobado Espanol', type: 'text', width: 'w-40', field: 'tituloAprobadoEspanol' },
  { id: 'genre', label: 'Genero', type: 'dropdown', width: 'w-24', field: 'genre', options: GENRE_OPTIONS },
  { id: 'formato', label: 'Formato', type: 'multi-select', width: 'w-56', field: 'formato', options: FORMATO_OPTIONS },
  { id: 'servicios', label: 'Servicios', type: 'multi-select', width: 'w-72', field: 'servicios', options: SERVICIOS_OPTIONS },
  { id: 'cantidadEpisodios', label: 'Cantidad Episodios', type: 'number', width: 'w-28', field: 'cantidadEpisodios' },
  { id: 'entregaFinalScriptItems', label: 'Entrega Final - Script y Dubcard', type: 'multi-select', width: 'w-96', field: 'entregaFinalScriptItems', options: ENTREGA_FINAL_SCRIPT_OPTIONS },
  { id: 'entregaFinalDubAudioItems', label: 'Entrega Final - Dub Audio', type: 'multi-select', width: 'w-96', field: 'entregaFinalDubAudioItems', options: ENTREGA_FINAL_DUB_AUDIO_OPTIONS },
  { id: 'traductor', label: 'Traductor', type: 'person', width: 'w-28', field: 'traductor', roleFilter: 'translator' },
  { id: 'adaptador', label: 'Adaptador', type: 'person', width: 'w-28', field: 'adaptador', roleFilter: 'adapter' },
  { id: 'mixerBogota', label: 'Mixer Bogota', type: 'person', width: 'w-28', field: 'mixerBogota', roleFilter: 'premix' },
  { id: 'mixerMiami', label: 'Mixer Miami', type: 'person', width: 'w-28', field: 'mixerMiami', roleFilter: 'mixer' },
  { id: 'qcMix', label: 'QC Mix', type: 'person', width: 'w-28', field: 'qcMix', roleFilter: 'qc_mix' },
];
