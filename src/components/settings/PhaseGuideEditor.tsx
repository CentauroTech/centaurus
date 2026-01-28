import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2, Save, GripVertical } from 'lucide-react';
import { PhaseGuide } from '@/config/phaseGuides';

interface PhaseGuideEditorProps {
  phaseKey: string;
  guideData: {
    source: 'database' | 'static';
    data: PhaseGuide;
  };
  onSave: (data: {
    title: string;
    color: string;
    overview: string;
    keyColumns: { name: string; description: string }[];
    workflow: { step: number; action: string; detail: string }[];
    roles: { role: string; responsibility: string }[];
    nextPhase: string;
    triggerCondition: string;
  }) => Promise<void>;
  isSaving: boolean;
}

const COLOR_OPTIONS = [
  { label: 'Blue', value: 'bg-blue-500' },
  { label: 'Purple', value: 'bg-purple-500' },
  { label: 'Green', value: 'bg-green-500' },
  { label: 'Amber', value: 'bg-amber-500' },
  { label: 'Pink', value: 'bg-pink-500' },
  { label: 'Red', value: 'bg-red-500' },
  { label: 'Indigo', value: 'bg-indigo-500' },
  { label: 'Cyan', value: 'bg-cyan-500' },
  { label: 'Orange', value: 'bg-orange-500' },
  { label: 'Teal', value: 'bg-teal-500' },
  { label: 'Violet', value: 'bg-violet-500' },
  { label: 'Emerald', value: 'bg-emerald-500' },
  { label: 'Rose', value: 'bg-rose-500' },
  { label: 'Sky', value: 'bg-sky-500' },
];

export function PhaseGuideEditor({ phaseKey, guideData, onSave, isSaving }: PhaseGuideEditorProps) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('bg-blue-500');
  const [overview, setOverview] = useState('');
  const [keyColumns, setKeyColumns] = useState<{ name: string; description: string }[]>([]);
  const [workflow, setWorkflow] = useState<{ step: number; action: string; detail: string }[]>([]);
  const [roles, setRoles] = useState<{ role: string; responsibility: string }[]>([]);
  const [nextPhase, setNextPhase] = useState('');
  const [triggerCondition, setTriggerCondition] = useState('');

  // Reset form when phase changes
  useEffect(() => {
    const data = guideData.data;
    setTitle(data.title);
    setColor(data.color);
    setOverview(data.overview);
    setKeyColumns([...data.keyColumns]);
    setWorkflow([...data.workflow]);
    setRoles([...data.roles]);
    setNextPhase(data.nextPhase);
    setTriggerCondition(data.triggerCondition);
  }, [phaseKey, guideData]);

  const handleSave = async () => {
    await onSave({
      title,
      color,
      overview,
      keyColumns,
      workflow,
      roles,
      nextPhase,
      triggerCondition,
    });
  };

  // Key Columns handlers
  const addKeyColumn = () => {
    setKeyColumns([...keyColumns, { name: '', description: '' }]);
  };

  const updateKeyColumn = (index: number, field: 'name' | 'description', value: string) => {
    const updated = [...keyColumns];
    updated[index][field] = value;
    setKeyColumns(updated);
  };

  const removeKeyColumn = (index: number) => {
    setKeyColumns(keyColumns.filter((_, i) => i !== index));
  };

  // Workflow handlers
  const addWorkflowStep = () => {
    const nextStep = workflow.length > 0 ? Math.max(...workflow.map(w => w.step)) + 1 : 1;
    setWorkflow([...workflow, { step: nextStep, action: '', detail: '' }]);
  };

  const updateWorkflowStep = (index: number, field: 'action' | 'detail', value: string) => {
    const updated = [...workflow];
    updated[index][field] = value;
    setWorkflow(updated);
  };

  const removeWorkflowStep = (index: number) => {
    const updated = workflow.filter((_, i) => i !== index);
    // Renumber steps
    updated.forEach((w, i) => (w.step = i + 1));
    setWorkflow(updated);
  };

  // Roles handlers
  const addRole = () => {
    setRoles([...roles, { role: '', responsibility: '' }]);
  };

  const updateRole = (index: number, field: 'role' | 'responsibility', value: string) => {
    const updated = [...roles];
    updated[index][field] = value;
    setRoles(updated);
  };

  const removeRole = (index: number) => {
    setRoles(roles.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full ${color}`} />
          <h3 className="text-lg font-semibold">{title || 'Untitled Phase'}</h3>
          {guideData.source === 'static' && (
            <span className="text-xs text-muted-foreground">(Using default content)</span>
          )}
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={['basic', 'columns', 'workflow', 'roles']} className="space-y-4">
        {/* Basic Info */}
        <AccordionItem value="basic" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-medium">Basic Information</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Phase title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setColor(opt.value)}
                      className={`w-8 h-8 rounded-full ${opt.value} ${
                        color === opt.value ? 'ring-2 ring-offset-2 ring-primary' : ''
                      }`}
                      title={opt.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="overview">Overview</Label>
              <Textarea
                id="overview"
                value={overview}
                onChange={(e) => setOverview(e.target.value)}
                placeholder="Describe what happens in this phase..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nextPhase">Next Phase</Label>
                <Input
                  id="nextPhase"
                  value={nextPhase}
                  onChange={(e) => setNextPhase(e.target.value)}
                  placeholder="e.g., Translation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="triggerCondition">Trigger Condition</Label>
                <Input
                  id="triggerCondition"
                  value={triggerCondition}
                  onChange={(e) => setTriggerCondition(e.target.value)}
                  placeholder="e.g., Status set to 'Done'"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Key Columns */}
        <AccordionItem value="columns" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-medium">Key Columns ({keyColumns.length})</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-4">
            {keyColumns.map((col, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-grab" />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    value={col.name}
                    onChange={(e) => updateKeyColumn(index, 'name', e.target.value)}
                    placeholder="Column name"
                  />
                  <Input
                    value={col.description}
                    onChange={(e) => updateKeyColumn(index, 'description', e.target.value)}
                    placeholder="Description"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeKeyColumn(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addKeyColumn}>
              <Plus className="h-4 w-4 mr-2" />
              Add Column
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Workflow */}
        <AccordionItem value="workflow" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-medium">Workflow Steps ({workflow.length})</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-4">
            {workflow.map((step, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium shrink-0">
                  {step.step}
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    value={step.action}
                    onChange={(e) => updateWorkflowStep(index, 'action', e.target.value)}
                    placeholder="Action title"
                  />
                  <Textarea
                    value={step.detail}
                    onChange={(e) => updateWorkflowStep(index, 'detail', e.target.value)}
                    placeholder="Step details..."
                    rows={2}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeWorkflowStep(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addWorkflowStep}>
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Roles */}
        <AccordionItem value="roles" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-medium">Roles & Responsibilities ({roles.length})</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-4">
            {roles.map((role, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-grab" />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    value={role.role}
                    onChange={(e) => updateRole(index, 'role', e.target.value)}
                    placeholder="Role name"
                  />
                  <Input
                    value={role.responsibility}
                    onChange={(e) => updateRole(index, 'responsibility', e.target.value)}
                    placeholder="Responsibility"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRole(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addRole}>
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
