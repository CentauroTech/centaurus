import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ENTREGA_FINAL_SCRIPT_OPTIONS,
  ENTREGA_FINAL_DUB_AUDIO_OPTIONS,
} from '@/types/board';

interface BoardGroup {
  id: string;
  name: string;
  color: string;
}

interface MultipleWODialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTasks: (groupId: string, template: TaskTemplate, names: string[]) => void;
  groups: BoardGroup[];
  isCreating?: boolean;
}

export interface TaskTemplate {
  name: string;
  client_name?: string;
  project_manager_id?: string;
  servicios?: string[];
  formato?: string[];
  cantidad_episodios?: number;
  branch?: string;
  genre?: string;
  lenguaje_original?: string;
  locked_runtime?: string;
  final_runtime?: string;
  show_guide?: string;
  titulo_aprobado_espanol?: string;
  rate_info?: string;
  rates?: number;
  studio?: string;
  entrega_final_script_items?: string[];
  entrega_final_dub_audio_items?: string[];
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
  lockedRuntime: 'locked_runtime',
  finalRuntime: 'final_runtime',
  showGuide: 'show_guide',
  tituloAprobadoEspanol: 'titulo_aprobado_espanol',
  rateInfo: 'rate_info',
  rates: 'rates',
  studio: 'studio',
  entregaFinalScriptItems: 'entrega_final_script_items',
  entregaFinalDubAudioItems: 'entrega_final_dub_audio_items',
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
    case 'entregaFinalScriptItems': return ENTREGA_FINAL_SCRIPT_OPTIONS;
    case 'entregaFinalDubAudioItems': return ENTREGA_FINAL_DUB_AUDIO_OPTIONS;
    default: return [];
  }
};

// Columns that can be set as template fields (exclude system/auto fields)
const TEMPLATE_COLUMNS = COLUMNS.filter(col => 
  !['isPrivate', 'name', 'status', 'lastUpdated', 'currentPhase', 'people', 'dateAssigned', 'dateDelivered', 'phaseDueDate', 'entregaCliente', 'premixRetakeList', 'mixRetakeList', 'projectManager', 'director', 'tecnico', 'qc1', 'qcRetakes', 'mixerBogota', 'mixerMiami', 'qcMix', 'traductor', 'adaptador', 'aorNeeded', 'pruebaDeVoz', 'aorComplete', 'dontUseStart', 'dontUseEnd', 'entregaMiamiStart', 'entregaMiamiEnd', 'entregaMixRetakes', 'entregaSesiones', 'entregaFinalDubAudio', 'entregaFinalScript', 'linkToColHQ', 'hq', 'workOrderNumber'].includes(col.id)
);

// Group template columns by category
const COLUMN_CATEGORIES = {
  basic: {
    label: 'Basic Info',
    columns: TEMPLATE_COLUMNS.filter(c => ['clientName', 'branch', 'genre', 'cantidadEpisodios'].includes(c.id)),
  },
  production: {
    label: 'Production Details',
    columns: TEMPLATE_COLUMNS.filter(c => ['servicios', 'formato', 'lenguajeOriginal', 'studio'].includes(c.id)),
  },
  content: {
    label: 'Content Info',
    columns: TEMPLATE_COLUMNS.filter(c => ['lockedRuntime', 'finalRuntime', 'showGuide', 'tituloAprobadoEspanol'].includes(c.id)),
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
  const valueSet = new Set(value);

  const toggleOption = (opt: string) => {
    if (valueSet.has(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  return (
    <div className="relative">
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
  isCreating = false 
}: MultipleWODialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || '');
  const [baseName, setBaseName] = useState('');
  const [startingSuffix, setStartingSuffix] = useState('1');
  const [count, setCount] = useState(5);
  const [template, setTemplate] = useState<TaskTemplate>({ name: '' });
  const [existingData, setExistingData] = useState<Record<string, string[]>>({});
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    basic: true,
    production: false,
    content: false,
    deliverables: false,
    rates: false,
  });

  // Fetch existing values for autocomplete
  useEffect(() => {
    if (isOpen) {
      fetchExistingValues();
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

  const generatedNames = baseName && startingSuffix 
    ? generateSequentialNames(baseName, startingSuffix, count)
    : [];

  const handleReset = () => {
    setStep(1);
    setBaseName('');
    setStartingSuffix('1');
    setCount(5);
    setTemplate({ name: '' });
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleCreate = () => {
    if (selectedGroupId && generatedNames.length > 0) {
      onCreateTasks(selectedGroupId, template, generatedNames);
      handleClose();
    }
  };

  const updateTemplate = (fieldId: string, value: string | string[] | number | undefined) => {
    const templateKey = FIELD_TO_TEMPLATE_KEY[fieldId];
    if (templateKey) {
      setTemplate(prev => ({ ...prev, [templateKey]: value }));
    }
  };

  const getTemplateValue = (fieldId: string): string | string[] | number | undefined => {
    const templateKey = FIELD_TO_TEMPLATE_KEY[fieldId];
    if (templateKey) {
      return template[templateKey];
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

  const canProceed = baseName.trim() !== '' && startingSuffix.trim() !== '' && count > 0 && selectedGroupId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="w-5 h-5" />
            {step === 1 ? 'Create Multiple Work Orders' : 'Confirm Names'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <ScrollArea className="max-h-[60vh] pr-4">
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
              <div className="grid grid-cols-2 gap-4">
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
              </div>

              {/* Count */}
              <div className="space-y-2">
                <Label htmlFor="count">Number of Items</Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                />
                <p className="text-xs text-muted-foreground">Maximum 50 items at once</p>
              </div>

              {/* Preview hint */}
              {baseName && startingSuffix && (
                <div className="bg-muted/50 rounded-md p-3 text-sm">
                  <span className="text-muted-foreground">Preview: </span>
                  <span className="font-medium">{generatedNames[0]}</span>
                  {count > 1 && (
                    <>
                      <span className="text-muted-foreground"> → </span>
                      <span className="font-medium">{generatedNames[generatedNames.length - 1]}</span>
                    </>
                  )}
                </div>
              )}

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
                        <div className="grid grid-cols-2 gap-3 mt-2">
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
              You are about to create <span className="font-semibold text-foreground">{count}</span> items:
            </p>
            <ScrollArea className="h-[300px] border rounded-md p-3">
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
                Create {count} Items
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
