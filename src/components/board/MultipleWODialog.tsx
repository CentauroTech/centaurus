import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Check, ListPlus } from 'lucide-react';
import { generateSequentialNames } from '@/hooks/useAddMultipleTasks';

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

interface TaskTemplate {
  name: string;
  client_name?: string;
  project_manager_id?: string;
  servicios?: string;
  formato?: string;
  cantidad_episodios?: number;
  branch?: string;
  genre?: string;
  lenguaje_original?: string;
}

const BRANCH_OPTIONS = ['Colombia', 'Miami', 'Brazil', 'Mexico'];
const SERVICES_OPTIONS = ['Dub', 'Mix', 'QC', 'Retakes', 'Script'];
const FORMAT_OPTIONS = ['Feature Film', 'Series', 'Documentary', 'Animation', 'Short'];

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
  const [template, setTemplate] = useState<TaskTemplate>({
    name: '',
    client_name: '',
    servicios: '',
    formato: '',
    branch: '',
  });

  const generatedNames = baseName && startingSuffix 
    ? generateSequentialNames(baseName, startingSuffix, count)
    : [];

  const handleReset = () => {
    setStep(1);
    setBaseName('');
    setStartingSuffix('1');
    setCount(5);
    setTemplate({
      name: '',
      client_name: '',
      servicios: '',
      formato: '',
      branch: '',
    });
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

  const canProceed = baseName.trim() !== '' && startingSuffix.trim() !== '' && count > 0 && selectedGroupId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="w-5 h-5" />
            {step === 1 ? 'Create Multiple Work Orders' : 'Confirm Names'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
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

            {/* Optional Template Fields */}
            <div className="space-y-2 border-t pt-4">
              <Label className="text-sm font-medium text-muted-foreground">Optional Template Fields</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName" className="text-xs">Client Name</Label>
                  <Input
                    id="clientName"
                    placeholder="Client name"
                    value={template.client_name || ''}
                    onChange={(e) => setTemplate({ ...template, client_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch" className="text-xs">Branch</Label>
                  <Select 
                    value={template.branch || ''} 
                    onValueChange={(val) => setTemplate({ ...template, branch: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCH_OPTIONS.map((branch) => (
                        <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="services" className="text-xs">Services</Label>
                  <Select 
                    value={template.servicios || ''} 
                    onValueChange={(val) => setTemplate({ ...template, servicios: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICES_OPTIONS.map((service) => (
                        <SelectItem key={service} value={service}>{service}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="format" className="text-xs">Format</Label>
                  <Select 
                    value={template.formato || ''} 
                    onValueChange={(val) => setTemplate({ ...template, formato: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAT_OPTIONS.map((format) => (
                        <SelectItem key={format} value={format}>{format}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
          </div>
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
