import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Check, ListPlus, ChevronDown, ChevronRight, X, Upload, FileText, Trash2 } from 'lucide-react';
import { generateSequentialNames } from '@/hooks/useAddMultipleTasks';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { FILE_CATEGORIES, FileCategory } from '@/hooks/useTaskFiles';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  COLUMNS,
  BRANCH_OPTIONS,
  CLIENT_OPTIONS,
  SERVICIOS_OPTIONS,
  FORMATO_OPTIONS,
  LENGUAJE_OPTIONS,
  GENRE_OPTIONS,
  TARGET_LANGUAGE_OPTIONS,
  VOICE_TEST_OPTIONS,
  ENTREGA_FINAL_SCRIPT_OPTIONS,
  ENTREGA_FINAL_DUB_AUDIO_OPTIONS,
} from '@/types/board';

interface BoardGroup {
  id: string;
  name: string;
  color: string;
}

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
}

interface MultipleWODialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTasks: (groupId: string, template: TaskTemplate, names: string[], branches: string[]) => void;
  groups: BoardGroup[];
  isCreating?: boolean;
  defaultGroupId?: string | null;
  currentWorkspaceName?: string;
}

export interface TaskTemplate {
  name: string;
  client_name?: string;
  project_manager_id?: string;
  servicios?: string[];
  formato?: string[];
  cantidad_episodios?: number;
  branches?: string[];
  branch?: string;
  genre?: string;
  lenguaje_original?: string;
  target_language?: string[];
  prueba_de_voz?: string;
  locked_runtime?: string;
  final_runtime?: string;
  show_guide?: string;
  titulo_aprobado_espanol?: string;
  rate_info?: string;
  rates?: number;
  studio?: string;
  aor_needed?: boolean;
  entrega_final_script_items?: string[];
  entrega_final_dub_audio_items?: string[];
  studio_assigned?: string;
  kickoff_brief?: string;
  abbreviation?: string;
  // Per-episode individual runtimes (index -> runtime string)
  individualRuntimes?: Record<number, string>;
  // Per-episode individual phase due dates (index -> { phase_field -> date })
  individualPhaseDueDates?: Record<number, Record<string, string>>;
  // Pending files to upload after task creation
  pendingFiles?: PendingFile[];
  // Delivery dates
  entrega_cliente?: string;
  entrega_miami_start?: string;
  entrega_miami_end?: string;
  entrega_sesiones?: string;
  entrega_mix_retakes?: string;
  entrega_final_script?: string;
  entrega_final_dub_audio?: string;
  // Phase-specific due dates
  assets_due_date?: string;
  translation_due_date?: string;
  adapting_due_date?: string;
  voice_tests_due_date?: string;
  recording_due_date?: string;
  premix_due_date?: string;
  qc_premix_due_date?: string;
  retakes_due_date?: string;
  qc_retakes_due_date?: string;
  mix_due_date?: string;
  qc_mix_due_date?: string;
  mix_retakes_due_date?: string;
}

export interface PendingFile {
  file: File;
  category: FileCategory;
}

// Map database field names to template keys
const FIELD_TO_TEMPLATE_KEY: Record<string, keyof TaskTemplate> = {
  clientName: 'client_name',
  branch: 'branch',
  genre: 'genre',
  servicios: 'servicios',
  formato: 'formato',
  cantidadEpisodios: 'cantidad_episodios',
  lenguajeOriginal: 'lenguaje_original',
  targetLanguage: 'target_language',
  pruebaDeVoz: 'prueba_de_voz',
  lockedRuntime: 'locked_runtime',
  finalRuntime: 'final_runtime',
  showGuide: 'show_guide',
  tituloAprobadoEspanol: 'titulo_aprobado_espanol',
  rateInfo: 'rate_info',
  rates: 'rates',
  studio: 'studio',
  aorNeeded: 'aor_needed',
  entregaFinalScriptItems: 'entrega_final_script_items',
  entregaFinalDubAudioItems: 'entrega_final_dub_audio_items',
  studioAssigned: 'studio_assigned',
  kickoffBrief: 'kickoff_brief',
  // Delivery dates
  entregaCliente: 'entrega_cliente',
  entregaMiamiStart: 'entrega_miami_start',
  entregaMiamiEnd: 'entrega_miami_end',
  entregaSesiones: 'entrega_sesiones',
  entregaMixRetakes: 'entrega_mix_retakes',
  entregaFinalScript: 'entrega_final_script',
  entregaFinalDubAudio: 'entrega_final_dub_audio',
  // Phase due dates
  assetsDueDate: 'assets_due_date',
  translationDueDate: 'translation_due_date',
  adaptingDueDate: 'adapting_due_date',
  voiceTestsDueDate: 'voice_tests_due_date',
  recordingDueDate: 'recording_due_date',
  premixDueDate: 'premix_due_date',
  qcPremixDueDate: 'qc_premix_due_date',
  retakesDueDate: 'retakes_due_date',
  qcRetakesDueDate: 'qc_retakes_due_date',
  mixDueDate: 'mix_due_date',
  qcMixDueDate: 'qc_mix_due_date',
  mixRetakesDueDate: 'mix_retakes_due_date',
};

// Get options for a field
const getOptionsForField = (fieldId: string): string[] => {
  switch (fieldId) {
    case 'clientName': return CLIENT_OPTIONS;
    case 'branch': return BRANCH_OPTIONS;
    case 'genre': return GENRE_OPTIONS;
    case 'servicios': return SERVICIOS_OPTIONS;
    case 'formato': return FORMATO_OPTIONS;
    case 'lenguajeOriginal': return LENGUAJE_OPTIONS;
    case 'targetLanguage': return TARGET_LANGUAGE_OPTIONS;
    case 'pruebaDeVoz': return VOICE_TEST_OPTIONS;
    case 'entregaFinalScriptItems': return ENTREGA_FINAL_SCRIPT_OPTIONS;
    case 'entregaFinalDubAudioItems': return ENTREGA_FINAL_DUB_AUDIO_OPTIONS;
    default: return [];
  }
};

// Columns that can be set as template fields (exclude system/auto fields)
const TEMPLATE_COLUMNS = COLUMNS.filter(col => 
  !['isPrivate', 'name', 'status', 'lastUpdated', 'currentPhase', 'people', 'dateAssigned', 'dateDelivered', 'phaseDueDate', 'premixRetakeList', 'mixRetakeList', 'projectManager', 'director', 'tecnico', 'qc1', 'qcRetakes', 'mixerBogota', 'mixerMiami', 'qcMix', 'traductor', 'adaptador', 'aorComplete', 'dontUseStart', 'dontUseEnd', 'linkToColHQ', 'hq', 'workOrderNumber', 'cantidadEpisodios'].includes(col.id)
);

// Group template columns by category
const COLUMN_CATEGORIES = {
  basic: {
    label: 'Basic Info',
    columns: TEMPLATE_COLUMNS.filter(c => ['clientName', 'genre', 'studioAssigned'].includes(c.id)),
  },
  language: {
    label: 'Language & Title',
    columns: TEMPLATE_COLUMNS.filter(c => ['lenguajeOriginal', 'targetLanguage', 'tituloAprobadoEspanol'].includes(c.id)),
  },
  production: {
    label: 'Production Details',
    columns: TEMPLATE_COLUMNS.filter(c => ['servicios', 'formato', 'pruebaDeVoz', 'aorNeeded'].includes(c.id)),
  },
  content: {
    label: 'Content Info',
    columns: TEMPLATE_COLUMNS.filter(c => ['lockedRuntime', 'finalRuntime', 'showGuide'].includes(c.id)),
    hasIndividualRuntimes: true,
  },
  deliveryDates: {
    label: 'Delivery Dates',
    columns: TEMPLATE_COLUMNS.filter(c => ['entregaCliente', 'entregaMiamiStart', 'entregaMiamiEnd', 'entregaSesiones', 'entregaMixRetakes', 'entregaFinalScript', 'entregaFinalDubAudio'].includes(c.id)),
  },
  phaseDueDates: {
    label: 'Phase Due Dates',
    hasIndividualPhaseDueDates: true,
    columns: [
      { id: 'assetsDueDate', label: 'Assets Due Date', type: 'date' as const, width: 'w-28', field: 'assetsDueDate' as any },
      { id: 'translationDueDate', label: 'Translation Due Date', type: 'date' as const, width: 'w-28', field: 'translationDueDate' as any },
      { id: 'adaptingDueDate', label: 'Adapting Due Date', type: 'date' as const, width: 'w-28', field: 'adaptingDueDate' as any },
      { id: 'voiceTestsDueDate', label: 'Voice Tests Due Date', type: 'date' as const, width: 'w-28', field: 'voiceTestsDueDate' as any },
      { id: 'recordingDueDate', label: 'Recording Due Date', type: 'date' as const, width: 'w-28', field: 'recordingDueDate' as any },
      { id: 'premixDueDate', label: 'Premix Due Date', type: 'date' as const, width: 'w-28', field: 'premixDueDate' as any },
      { id: 'qcPremixDueDate', label: 'QC Premix Due Date', type: 'date' as const, width: 'w-28', field: 'qcPremixDueDate' as any },
      { id: 'retakesDueDate', label: 'Retakes Due Date', type: 'date' as const, width: 'w-28', field: 'retakesDueDate' as any },
      { id: 'qcRetakesDueDate', label: 'QC Retakes Due Date', type: 'date' as const, width: 'w-28', field: 'qcRetakesDueDate' as any },
      { id: 'mixDueDate', label: 'Mix Due Date', type: 'date' as const, width: 'w-28', field: 'mixDueDate' as any },
      { id: 'qcMixDueDate', label: 'QC Mix Due Date', type: 'date' as const, width: 'w-28', field: 'qcMixDueDate' as any },
      { id: 'mixRetakesDueDate', label: 'Mix Retakes Due Date', type: 'date' as const, width: 'w-28', field: 'mixRetakesDueDate' as any },
    ],
  },
  deliverables: {
    label: 'Deliverables',
    columns: TEMPLATE_COLUMNS.filter(c => ['entregaFinalScriptItems', 'entregaFinalDubAudioItems'].includes(c.id)),
  },
  rates: {
    label: 'Rates',
    columns: TEMPLATE_COLUMNS.filter(c => ['rates', 'rateInfo'].includes(c.id)),
  },
};

// Combobox with autocomplete
function ComboboxField({
  value,
  onChange,
  options,
  existingValues,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  existingValues: string[];
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  // Combine predefined options with existing values
  const allOptions = Array.from(new Set([...options, ...existingValues])).sort();
  
  const filteredOptions = allOptions.filter(opt =>
    opt.toLowerCase().includes(inputValue.toLowerCase())
  );

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <div className="relative">
      <Input
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setTimeout(() => {
            setIsOpen(false);
            onChange(inputValue);
          }, 200);
        }}
        placeholder={placeholder}
        className="h-8 text-xs"
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
          {filteredOptions.slice(0, 10).map((opt) => (
            <button
              key={opt}
              type="button"
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted"
              onMouseDown={() => {
                setInputValue(opt);
                onChange(opt);
                setIsOpen(false);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Multi-select field
function MultiSelectField({
  value = [],
  onChange,
  options,
  placeholder,
}: {
  value: string[];
  onChange: (val: string[]) => void;
  options: string[];
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const valueSet = new Set(value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleOption = (opt: string) => {
    if (valueSet.has(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-auto min-h-[32px] px-2 py-1 text-left text-xs border rounded-md bg-background flex flex-wrap gap-1 items-center"
      >
        {value.length > 0 ? (
          value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-xs"
            >
              {v}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(value.filter(val => val !== v));
                }}
              />
            </span>
          ))
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={cn(
                "w-full px-3 py-1.5 text-left text-xs hover:bg-muted flex items-center justify-between",
                valueSet.has(opt) && "bg-muted"
              )}
              onClick={() => toggleOption(opt)}
            >
              <span>{opt}</span>
              {valueSet.has(opt) && <Check className="w-3 h-3 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MultipleWODialog({ 
  isOpen, 
  onClose, 
  onCreateTasks, 
  groups,
  isCreating = false,
  defaultGroupId = null,
  currentWorkspaceName = ''
}: MultipleWODialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(defaultGroupId || groups[0]?.id || '');
  const [baseName, setBaseName] = useState('');
  const [startingSuffix, setStartingSuffix] = useState('1');
  const [episodes, setEpisodes] = useState(1);
  const [useSpecialNumbering, setUseSpecialNumbering] = useState(false);
  const [specialNumbers, setSpecialNumbers] = useState('');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [template, setTemplate] = useState<TaskTemplate>({ name: '' });
  const [individualRuntimes, setIndividualRuntimes] = useState<Record<number, string>>({});
  const [individualPhaseDueDates, setIndividualPhaseDueDates] = useState<Record<number, Record<string, string>>>({});
  const [selectedEpisodeForDates, setSelectedEpisodeForDates] = useState<number | null>(null);
  const [existingData, setExistingData] = useState<Record<string, string[]>>({});
  const [projectManagers, setProjectManagers] = useState<TeamMember[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileCategory, setSelectedFileCategory] = useState<FileCategory>('general');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    basic: true,
    language: true,
    production: false,
    content: false,
    deliveryDates: false,
    phaseDueDates: false,
    deliverables: false,
    rates: false,
  });

  // Update selectedGroupId when defaultGroupId changes
  useEffect(() => {
    if (defaultGroupId) {
      setSelectedGroupId(defaultGroupId);
    }
  }, [defaultGroupId]);

  // Fetch existing values and project managers
  useEffect(() => {
    if (isOpen) {
      fetchExistingValues();
      fetchProjectManagers();
    }
  }, [isOpen]);

  const fetchExistingValues = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('client_name, studio')
      .limit(500);

    if (data) {
      const clients = [...new Set(data.map(t => t.client_name).filter(Boolean))] as string[];
      const studios = [...new Set(data.map(t => t.studio).filter(Boolean))] as string[];
      setExistingData({
        clientName: clients,
        studio: studios,
      });
    }
  };

  // Only these people can be assigned as Project Manager
  const APPROVED_PM_NAMES = ['ana otto', 'william rozo', 'jill martinez', 'julio neri', 'cristiano ronaldo'];
  
  const fetchProjectManagers = async () => {
    const { data } = await supabase
      .from('team_members')
      .select('id, name, initials, color, role')
      .order('name');

    if (data) {
      // Filter to only approved PMs
      const approvedPMs = data.filter(m => 
        APPROVED_PM_NAMES.includes(m.name.toLowerCase())
      );
      setProjectManagers(approvedPMs);
    }
  };

  // Generate names based on mode
  const generatedNames = (() => {
    if (!baseName) return [];
    if (useSpecialNumbering) {
      const numbers = specialNumbers.split(',').map(s => s.trim()).filter(Boolean);
      const prefix = startingSuffix ? `${startingSuffix}` : '';
      return numbers.map(n => `${baseName} ${prefix}${n}`);
    }
    return episodes > 0 ? generateSequentialNames(baseName, startingSuffix || '1', episodes) : [];
  })();

  const handleReset = () => {
    setStep(1);
    setBaseName('');
    setStartingSuffix('1');
    setEpisodes(1);
    setUseSpecialNumbering(false);
    setSpecialNumbers('');
    setSelectedBranches([]);
    setTemplate({ name: '' });
    setIndividualRuntimes({});
    setIndividualPhaseDueDates({});
    setSelectedEpisodeForDates(null);
    setPendingFiles([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleCreate = () => {
    if (selectedGroupId && generatedNames.length > 0 && selectedBranches.length > 0) {
      const hasIndividualRuntimes = Object.values(individualRuntimes).some(v => v?.trim());
      const hasIndividualPhaseDates = Object.values(individualPhaseDueDates).some(
        epDates => Object.values(epDates).some(v => v?.trim())
      );
      const templateWithEpisodes = { 
        ...template, 
        cantidad_episodios: generatedNames.length,
        branches: selectedBranches,
        pendingFiles: pendingFiles.length > 0 ? pendingFiles : undefined,
        individualRuntimes: hasIndividualRuntimes ? individualRuntimes : undefined,
        individualPhaseDueDates: hasIndividualPhaseDates ? individualPhaseDueDates : undefined,
      };
      onCreateTasks(selectedGroupId, templateWithEpisodes, generatedNames, selectedBranches);
      handleClose();
    }
  };

  const handleFileCategorySelect = (category: FileCategory) => {
    setSelectedFileCategory(category);
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFiles(prev => [...prev, { file, category: selectedFileCategory }]);
      e.target.value = '';
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateTemplate = (fieldId: string, value: string | string[] | number | boolean | undefined) => {
    const templateKey = FIELD_TO_TEMPLATE_KEY[fieldId];
    if (templateKey) {
      setTemplate(prev => ({ ...prev, [templateKey]: value }));
    }
  };

  const getTemplateValue = (fieldId: string): string | string[] | number | boolean | undefined => {
    const templateKey = FIELD_TO_TEMPLATE_KEY[fieldId];
    if (templateKey) {
      return template[templateKey] as string | string[] | number | boolean | undefined;
    }
    return undefined;
  };

  const renderField = (column: typeof TEMPLATE_COLUMNS[0]) => {
    const options = getOptionsForField(column.id);
    const existing = existingData[column.id] || [];
    const value = getTemplateValue(column.id);

    switch (column.type) {
      case 'multi-select':
        return (
          <MultiSelectField
            value={(value as string[]) || []}
            onChange={(val) => updateTemplate(column.id, val)}
            options={options}
            placeholder={`Select ${column.label.toLowerCase()}`}
          />
        );

      case 'dropdown':
        return (
          <Select 
            value={(value as string) || ''} 
            onValueChange={(val) => updateTemplate(column.id, val)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={`Select ${column.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'combobox':
        return (
          <ComboboxField
            value={(value as string) || ''}
            onChange={(val) => updateTemplate(column.id, val)}
            options={options}
            existingValues={existing}
            placeholder={`Enter ${column.label.toLowerCase()}`}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={(value as number) || ''}
            onChange={(e) => updateTemplate(column.id, e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="0"
            className="h-8 text-xs"
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => updateTemplate(column.id, e.target.value || undefined)}
            className="h-8 text-xs"
          />
        );

      case 'boolean':
        return (
          <Select 
            value={value === true ? 'yes' : value === false ? 'no' : ''} 
            onValueChange={(val) => updateTemplate(column.id, val === 'yes' ? true : val === 'no' ? false : undefined)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        );

      case 'text':
      default:
        return (
          <ComboboxField
            value={(value as string) || ''}
            onChange={(val) => updateTemplate(column.id, val)}
            options={[]}
            existingValues={existing}
            placeholder={`Enter ${column.label.toLowerCase()}`}
          />
        );
    }
  };

  const toggleCategory = (key: string) => {
    setOpenCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const canProceed = baseName.trim() !== '' && 
    generatedNames.length > 0 &&
    selectedGroupId && 
    selectedBranches.length > 0 &&
    template.project_manager_id;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[95vh] w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="w-5 h-5" />
            {step === 1 ? 'Create Work Order' : 'Confirm Names'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4 py-4">
              {/* Naming Pattern */}
              <div className="space-y-2">
                <Label htmlFor="baseName">Base Name</Label>
                <Input
                  id="baseName"
                  placeholder="e.g., Test Item"
                  value={baseName}
                  onChange={(e) => setBaseName(e.target.value)}
                />
              </div>

              {/* Special Numbering Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setUseSpecialNumbering(false)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-md border transition-colors",
                    !useSpecialNumbering ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  Sequence Numbering
                </button>
                <button
                  type="button"
                  onClick={() => setUseSpecialNumbering(true)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-md border transition-colors",
                    useSpecialNumbering ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  Special Numbering
                </button>
              </div>

              {!useSpecialNumbering ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="suffix">Starting Suffix</Label>
                    <Input
                      id="suffix"
                      placeholder="e.g., 100, B1, EP01"
                      value={startingSuffix}
                      onChange={(e) => setStartingSuffix(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="episodes">Number of Episodes</Label>
                    <Input
                      id="episodes"
                      type="number"
                      min={1}
                      max={50}
                      value={episodes}
                      onChange={(e) => setEpisodes(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="suffix">Starting Suffix</Label>
                    <Input
                      id="suffix"
                      placeholder="e.g., 100, B1, EP01"
                      value={startingSuffix}
                      onChange={(e) => setStartingSuffix(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialNumbers">Episode Numbers (comma-separated)</Label>
                    <Input
                      id="specialNumbers"
                      placeholder="e.g., 1, 3, 5, 12, 15"
                      value={specialNumbers}
                      onChange={(e) => setSpecialNumbers(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter non-sequential episode numbers separated by commas
                    </p>
                  </div>
                </div>
              )}

              {/* Preview hint */}
              {generatedNames.length > 0 && (
                <div className="bg-muted/50 rounded-md p-3 text-sm">
                  <span className="text-muted-foreground">Preview: </span>
                  <span className="font-medium">{generatedNames[0]}</span>
                  {generatedNames.length > 1 && (
                    <>
                      <span className="text-muted-foreground"> → </span>
                      <span className="font-medium">{generatedNames[generatedNames.length - 1]}</span>
                    </>
                  )}
                  <span className="text-muted-foreground ml-2">({generatedNames.length} episodes)</span>
                </div>
              )}

              {/* Required Fields */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Branch - Required, Multi-select */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Branch(es) <span className="text-destructive">*</span>
                    </Label>
                    <MultiSelectField
                      value={selectedBranches}
                      onChange={setSelectedBranches}
                      options={BRANCH_OPTIONS}
                      placeholder="Select branch(es)"
                    />
                    {selectedBranches.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        WO will be created in each selected branch's workspace
                      </p>
                    )}
                  </div>

                  {/* Project Manager - Required */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Project Manager <span className="text-destructive">*</span>
                    </Label>
                    <Select 
                      value={template.project_manager_id || ''} 
                      onValueChange={(val) => setTemplate(prev => ({ ...prev, project_manager_id: val || undefined }))}
                    >
                      <SelectTrigger className={cn("h-9", !template.project_manager_id && "border-destructive/50")}>
                        <SelectValue placeholder="Select project manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectManagers.map((pm) => (
                          <SelectItem key={pm.id} value={pm.id}>
                            <span className="flex items-center gap-2">
                              <span 
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white"
                                style={{ backgroundColor: pm.color }}
                              >
                                {pm.initials}
                              </span>
                              {pm.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(selectedBranches.length === 0 || !template.project_manager_id) && (
                  <p className="text-xs text-destructive mt-2">
                    Branch and Project Manager are required to generate Work Order numbers.
                  </p>
                )}
              </div>

              {/* Abbreviation / Nickname */}
              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="abbreviation">Abbreviation / Nickname</Label>
                <Input
                  id="abbreviation"
                  placeholder="e.g., TLK for The Lion King"
                  value={template.abbreviation || ''}
                  onChange={(e) => setTemplate(prev => ({ ...prev, abbreviation: e.target.value || undefined }))}
                  className="h-9"
                />
              </div>

              {/* Additional Instructions */}
              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="additionalInstructions">Additional Instructions</Label>
                <Textarea
                  id="additionalInstructions"
                  placeholder="Enter any additional instructions or notes for these work orders..."
                  value={template.kickoff_brief || ''}
                  onChange={(e) => setTemplate(prev => ({ ...prev, kickoff_brief: e.target.value || undefined }))}
                  className="min-h-[80px] text-sm"
                />
              </div>

              {/* Production Files Upload */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Production Files</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileInputChange}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.mp3,.wav,.mp4,.mov,.zip,.xlsx,.xls,.csv"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" type="button">
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Add File
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {FILE_CATEGORIES.map((cat) => (
                        <DropdownMenuItem
                          key={cat.value}
                          onClick={() => handleFileCategorySelect(cat.value)}
                        >
                          <div>
                            <div className="text-sm">{cat.label}</div>
                            <div className="text-xs text-muted-foreground">{cat.description}</div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {pendingFiles.length > 0 && (
                  <div className="space-y-1.5 bg-muted/30 rounded-md p-2">
                    {pendingFiles.map((pf, idx) => {
                      const catLabel = FILE_CATEGORIES.find(c => c.value === pf.category)?.label || pf.category;
                      return (
                        <div key={idx} className="flex items-center gap-2 text-sm py-1 px-2 bg-background rounded">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate flex-1">{pf.file.name}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{catLabel}</span>
                          <button
                            type="button"
                            onClick={() => removePendingFile(idx)}
                            className="p-0.5 hover:bg-destructive/10 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      );
                    })}
                    <p className="text-xs text-muted-foreground px-2">
                      {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''} will be uploaded to all created tasks
                    </p>
                  </div>
                )}
              </div>

              {/* Template Fields - Collapsible Categories */}
              <div className="space-y-2 border-t pt-4">
                <Label className="text-sm font-medium text-muted-foreground">Optional Template Fields</Label>
                
                {Object.entries(COLUMN_CATEGORIES).map(([key, category]) => (
                  category.columns.length > 0 && (
                    <Collapsible
                      key={key}
                      open={openCategories[key]}
                      onOpenChange={() => toggleCategory(key)}
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 text-sm font-medium hover:bg-muted/50 rounded-md">
                        {openCategories[key] ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        {category.label}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {category.columns.length} fields
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-3 pb-3">
                        <div className="grid grid-cols-3 gap-3 mt-2">
                          {category.columns.map((column) => (
                            <div key={column.id} className="space-y-1">
                              <Label className="text-xs">{column.label}</Label>
                              {renderField(column)}
                            </div>
                          ))}
                        </div>
                        {/* Individual runtimes per episode - only in Content Info */}
                        {'hasIndividualRuntimes' in category && (category as any).hasIndividualRuntimes && generatedNames.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Individual Runtimes per Episode</Label>
                            <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-1">
                              {generatedNames.map((name, idx) => {
                                // Extract episode identifier from name
                                const parts = name.split(' ');
                                const episodeLabel = parts.length > 1 ? parts[parts.length - 1] : `${idx + 1}`;
                                return (
                                  <div key={idx} className="flex items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground w-12 flex-shrink-0 truncate" title={episodeLabel}>
                                      {episodeLabel}
                                    </span>
                                    <Input
                                      value={individualRuntimes[idx] || ''}
                                      onChange={(e) => setIndividualRuntimes(prev => ({ ...prev, [idx]: e.target.value }))}
                                      placeholder="e.g. 22:30"
                                      className="h-7 text-xs flex-1"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Leave blank to use the shared Locked Runtime above
                            </p>
                          </div>
                        )}
                        {/* Individual phase due dates per episode */}
                        {'hasIndividualPhaseDueDates' in category && (category as any).hasIndividualPhaseDueDates && generatedNames.length > 0 && (
                          <div className="mt-4 space-y-3 border-t pt-3">
                            <Label className="text-xs font-medium text-muted-foreground">Individual Episode Phase Due Dates</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {generatedNames.map((name, idx) => {
                                const parts = name.split(' ');
                                const episodeLabel = parts.length > 1 ? parts[parts.length - 1] : `${idx + 1}`;
                                const hasOverrides = individualPhaseDueDates[idx] && Object.values(individualPhaseDueDates[idx]).some(v => v?.trim());
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedEpisodeForDates(selectedEpisodeForDates === idx ? null : idx)}
                                    className={cn(
                                      "px-2.5 py-1 text-xs rounded-md border transition-colors",
                                      selectedEpisodeForDates === idx
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : hasOverrides
                                          ? "bg-accent text-accent-foreground border-accent"
                                          : "bg-background border-border text-muted-foreground hover:bg-muted"
                                    )}
                                  >
                                    {episodeLabel}
                                  </button>
                                );
                              })}
                            </div>
                            {selectedEpisodeForDates !== null && (
                              <div className="bg-muted/30 rounded-md p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-medium">
                                    Dates for Episode {(() => {
                                      const parts = generatedNames[selectedEpisodeForDates]?.split(' ') || [];
                                      return parts.length > 1 ? parts[parts.length - 1] : selectedEpisodeForDates + 1;
                                    })()}
                                  </Label>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedEpisodeForDates(null)}
                                    className="p-0.5 hover:bg-muted rounded"
                                  >
                                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  {category.columns.map((col) => {
                                    const fieldKey = FIELD_TO_TEMPLATE_KEY[col.id] || col.id;
                                    const epDates = individualPhaseDueDates[selectedEpisodeForDates] || {};
                                    return (
                                      <div key={col.id} className="space-y-0.5">
                                        <Label className="text-[10px] text-muted-foreground">{col.label}</Label>
                                        <Input
                                          type="date"
                                          value={epDates[fieldKey as string] || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setIndividualPhaseDueDates(prev => ({
                                              ...prev,
                                              [selectedEpisodeForDates!]: {
                                                ...(prev[selectedEpisodeForDates!] || {}),
                                                [fieldKey as string]: val,
                                              }
                                            }));
                                          }}
                                          className="h-7 text-xs"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Leave blank to use the shared dates above
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )
                ))}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              You are about to create <span className="font-semibold text-foreground">{generatedNames.length}</span> episodes:
            </p>
            <ScrollArea className="h-[400px] border rounded-md p-3">
              <div className="space-y-1">
                {generatedNames.map((name, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50"
                  >
                    <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                    <span className="text-sm">{name}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep(2)} disabled={!canProceed}>
                Preview Names
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                <Check className="w-4 h-4 mr-2" />
                Create {generatedNames.length} Episodes
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
