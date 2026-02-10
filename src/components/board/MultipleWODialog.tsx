import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Check, ListPlus, ChevronDown, ChevronRight, X } from 'lucide-react';
import { generateSequentialNames } from '@/hooks/useAddMultipleTasks';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
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
  },
  deliveryDates: {
    label: 'Delivery Dates',
    columns: TEMPLATE_COLUMNS.filter(c => ['entregaCliente', 'entregaMiamiStart', 'entregaMiamiEnd', 'entregaSesiones', 'entregaMixRetakes', 'entregaFinalScript', 'entregaFinalDubAudio'].includes(c.id)),
  },
  phaseDueDates: {
    label: 'Phase Due Dates',
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
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [template, setTemplate] = useState<TaskTemplate>({ name: '' });
  const [existingData, setExistingData] = useState<Record<string, string[]>>({});
  const [projectManagers, setProjectManagers] = useState<TeamMember[]>([]);
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

  const generatedNames = baseName && episodes > 0
    ? generateSequentialNames(baseName, startingSuffix || '1', episodes)
    : [];

  const handleReset = () => {
    setStep(1);
    setBaseName('');
    setStartingSuffix('1');
    setEpisodes(1);
    setSelectedBranches([]);
    setTemplate({ name: '' });
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleCreate = () => {
    if (selectedGroupId && generatedNames.length > 0 && selectedBranches.length > 0) {
      // Include episodes and branches in template
      const templateWithEpisodes = { 
        ...template, 
        cantidad_episodios: episodes,
        branches: selectedBranches 
      };
      onCreateTasks(selectedGroupId, templateWithEpisodes, generatedNames, selectedBranches);
      handleClose();
    }
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
    episodes > 0 && 
    selectedGroupId && 
    selectedBranches.length > 0 &&  // At least one branch required
    template.project_manager_id;  // Required (startingSuffix is optional, defaults to '1')

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
              {/* Group Selection */}
              <div className="space-y-2">
                <Label htmlFor="group">Target Group</Label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        <span className="flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: group.color }}
                          />
                          {group.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Naming Pattern */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseName">Base Name</Label>
                  <Input
                    id="baseName"
                    placeholder="e.g., Test Item"
                    value={baseName}
                    onChange={(e) => setBaseName(e.target.value)}
                  />
                </div>
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

              {/* Preview hint */}
              {baseName && startingSuffix && episodes > 0 && (
                <div className="bg-muted/50 rounded-md p-3 text-sm">
                  <span className="text-muted-foreground">Preview: </span>
                  <span className="font-medium">{generatedNames[0]}</span>
                  {episodes > 1 && (
                    <>
                      <span className="text-muted-foreground"> → </span>
                      <span className="font-medium">{generatedNames[generatedNames.length - 1]}</span>
                    </>
                  )}
                  <span className="text-muted-foreground ml-2">({episodes} episodes)</span>
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
              You are about to create <span className="font-semibold text-foreground">{episodes}</span> episodes:
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
                Create {episodes} Episodes
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
