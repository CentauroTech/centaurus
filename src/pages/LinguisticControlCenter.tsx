import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Languages, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAccessibleWorkspaces } from '@/hooks/useAccessibleWorkspaces';
import { useCanAccessFeature } from '@/hooks/useFeatureSettings';
import { useLinguisticTasks, LinguisticTask } from '@/hooks/useLinguisticTasks';
import { LinguisticTaskList } from '@/components/linguistic/LinguisticTaskList';
import { LinguisticAITab } from '@/components/linguistic/LinguisticAITab';
import { TodaysFocusStrip, isOverdue, isDueNext48h, isMissingFile } from '@/components/linguistic/TodaysFocusStrip';
import TaskDetailsPanel from '@/components/board/TaskDetailsPanel';
import { Task, User } from '@/types/board';
import { Loader2 } from 'lucide-react';

export default function LinguisticControlCenter() {
  const navigate = useNavigate();
  const { canAccess, isLoading: accessLoading } = useCanAccessFeature('linguistic_control_center');
  const { data: workspaces, isLoading: wsLoading } = useAccessibleWorkspaces();

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'translation' | 'adapting'>('all');
  const [focusFilter, setFocusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');

  // Default to first workspace
  const effectiveWorkspaceId = selectedWorkspaceId || workspaces?.[0]?.id || null;

  const { data: linguisticData, isLoading: tasksLoading } = useLinguisticTasks(effectiveWorkspaceId);
  const tasks = linguisticData?.tasks || [];
  const teamMemberMap = linguisticData?.teamMemberMap || new Map<string, User>();

  // Apply filters
  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (phaseFilter !== 'all') {
      result = result.filter(t => t.phase === phaseFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.workOrderNumber?.toLowerCase().includes(q) ||
        t.clientName?.toLowerCase().includes(q)
      );
    }

    if (focusFilter === 'overdue') result = result.filter(isOverdue);
    else if (focusFilter === 'due48h') result = result.filter(isDueNext48h);
    else if (focusFilter === 'missingFile') result = result.filter(isMissingFile);
    else if (focusFilter === 'waitingGuest') result = result.filter(t => t.guestSignal === 'waiting');

    return result;
  }, [tasks, phaseFilter, searchQuery, focusFilter]);

  // Build a Task object for TaskDetailsPanel from the selected linguistic task
  const selectedTask = useMemo((): Task | null => {
    if (!selectedTaskId) return null;
    const lt = tasks.find(t => t.id === selectedTaskId);
    if (!lt) return null;
    return {
      id: lt.id,
      name: lt.name,
      status: lt.status as any,
      branch: lt.branch,
      clientName: lt.clientName,
      workOrderNumber: lt.workOrderNumber,
      fase: lt.phase,
      currentPhase: lt.phase,
      translationDueDate: lt.translationDueDate || undefined,
      adaptingDueDate: lt.adaptingDueDate || undefined,
      projectManager: lt.projectManager,
      traductor: lt.traductor,
      adaptador: lt.adaptador,
      groupId: lt.groupId,
      lastUpdated: lt.lastUpdated || undefined,
    } as Task;
  }, [selectedTaskId, tasks]);

  const handleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  if (accessLoading || wsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">This feature is not enabled or you don't have permission.</p>
          <Button onClick={() => navigate('/')}>Go Back</Button>
        </div>
      </div>
    );
  }

  const currentWorkspace = workspaces?.find(w => w.id === effectiveWorkspaceId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Languages className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-display font-bold">Linguistic Control Center</h1>
                <p className="text-xs text-muted-foreground">Translation & Adapting Phase Management</p>
              </div>
            </div>

            {/* Workspace selector */}
            {workspaces && workspaces.length > 1 && (
              <div className="ml-4 flex gap-1">
                {workspaces.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => setSelectedWorkspaceId(ws.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                      effectiveWorkspaceId === ws.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {ws.name}
                  </button>
                ))}
              </div>
            )}

            {/* Phase filter chips */}
            <div className="ml-auto flex gap-1">
              {(['all', 'translation', 'adapting'] as const).map(phase => (
                <button
                  key={phase}
                  onClick={() => setPhaseFilter(phase)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    phaseFilter === phase
                      ? phase === 'translation' ? "bg-blue-200 text-blue-800"
                        : phase === 'adapting' ? "bg-teal-500 text-white"
                        : "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {phase === 'all' ? 'All' : phase === 'translation' ? 'Translation' : 'Adapting'}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search projects, WO#, client..."
                className="pl-9 h-9 text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-6 py-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="tasks" className="gap-2">
              <Languages className="w-4 h-4" />
              Tasks ({filteredTasks.length})
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Sparkles className="w-4 h-4" />
              AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4 mt-4">
            {/* Focus strip */}
            <TodaysFocusStrip
              tasks={tasks}
              activeFilter={focusFilter}
              onFilterClick={setFocusFilter}
            />

            {/* Task list */}
            <div className="bg-card rounded-lg border">
              {tasksLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <LinguisticTaskList
                  tasks={filteredTasks}
                  onSelectTask={handleSelectTask}
                  selectedTaskId={selectedTaskId}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="ai" className="mt-4">
            <div className="bg-card rounded-lg border p-6">
              <LinguisticAITab tasks={tasks} onSelectTask={handleSelectTask} />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Side panel */}
      {selectedTask && (
        <TaskDetailsPanel
          task={selectedTask}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          users={Array.from(teamMemberMap.values())}
          workspaceName={currentWorkspace?.name}
        />
      )}
    </div>
  );
}
