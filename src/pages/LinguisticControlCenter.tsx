import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Languages, Sparkles, X, CalendarDays, LogOut, Settings, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAccessibleWorkspaces, EXCLUDED_LCC_WORKSPACES } from '@/hooks/useAccessibleWorkspaces';
import { useCanAccessFeature } from '@/hooks/useFeatureSettings';
import { useLinguisticTasks, LinguisticTask } from '@/hooks/useLinguisticTasks';
import { LinguisticTaskList } from '@/components/linguistic/LinguisticTaskList';
import { LinguisticAITab } from '@/components/linguistic/LinguisticAITab';
import { LinguisticCalendarView } from '@/components/linguistic/LinguisticCalendarView';
import { TodaysFocusStrip, isOverdue, isDueNext48h, isMissingFile } from '@/components/linguistic/TodaysFocusStrip';
import TaskDetailsPanel from '@/components/board/TaskDetailsPanel';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import { Task, User } from '@/types/board';
import { Loader2 } from 'lucide-react';

export default function LinguisticControlCenter() {
  const navigate = useNavigate();
  const { canAccess, isLoading: accessLoading } = useCanAccessFeature('linguistic_control_center');
  const { data: workspaces, isLoading: wsLoading } = useAccessibleWorkspaces();
  const { data: sidebarWorkspaces } = useWorkspaces();
  const { user, signOut } = useAuth();
  const { data: currentTeamMember } = useCurrentTeamMember();
  const { language, updateLanguage } = useLanguagePreference();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'translation' | 'adapting'>('all');

  // Filter out excluded workspaces
  const filteredWorkspaces = useMemo(() => 
    workspaces?.filter(ws => !EXCLUDED_LCC_WORKSPACES.includes(ws.name)) || [],
    [workspaces]
  );
  const [focusFilter, setFocusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');

  // Default to first filtered workspace
  const effectiveWorkspaceId = selectedWorkspaceId || filteredWorkspaces[0]?.id || null;

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

  const handleSelectBoard = useCallback((boardId: string) => {
    navigate('/');
  }, [navigate]);

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
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">Go Back</button>
        </div>
      </div>
    );
  }

  const currentWorkspace = filteredWorkspaces.find(w => w.id === effectiveWorkspaceId);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar
        workspaces={sidebarWorkspaces || []}
        selectedBoardId={null}
        onSelectBoard={handleSelectBoard}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background border-b">
          <div className="px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Languages className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-xl font-display font-bold">Linguistic Control Center</h1>
                  <p className="text-xs text-muted-foreground">Translation & Adapting Phase Management</p>
                </div>
              </div>

              {/* Workspace selector */}
              {filteredWorkspaces.length > 1 && (
                <div className="ml-4 flex gap-1">
                  {filteredWorkspaces.map(ws => (
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

              {/* Search */}
              <div className="ml-auto relative w-64">
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

              {/* Notification bell */}
              <NotificationBell />

              {/* Profile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                    {currentTeamMember?.initials || user?.email?.substring(0, 2).toUpperCase() || 'U'}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-xs text-muted-foreground cursor-default">
                    {user?.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Notification Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateLanguage.mutate(language === 'en' ? 'es' : 'en')} disabled={updateLanguage.isPending}>
                    <Globe className="mr-2 h-4 w-4" />
                    {language === 'en' ? '🇪🇸 Cambiar a Español' : '🇺🇸 Switch to English'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <NotificationSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="tasks" className="gap-2">
                <Languages className="w-4 h-4" />
                Tasks ({filteredTasks.length})
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarDays className="w-4 h-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2">
                <Sparkles className="w-4 h-4" />
                AI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-4 mt-4">
              {/* Focus strip + Phase filter chips in same row */}
              <div className="flex items-center gap-3 flex-wrap">
                <TodaysFocusStrip
                  tasks={tasks}
                  activeFilter={focusFilter}
                  onFilterClick={setFocusFilter}
                />
                {/* Phase filter chips */}
                {(['translation', 'adapting'] as const).map(phase => {
                  const isActive = phaseFilter === phase;
                  return (
                    <button
                      key={phase}
                      onClick={() => setPhaseFilter(isActive ? 'all' : phase)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all text-sm font-medium",
                        "hover:scale-[1.02] active:scale-[0.98]",
                        isActive
                          ? phase === 'translation'
                            ? "bg-blue-500 text-primary-foreground border-blue-500/20"
                            : "bg-teal-500 text-primary-foreground border-teal-500/20"
                          : phase === 'translation'
                            ? "text-blue-500 bg-blue-500/10 border-blue-500/20"
                            : "text-teal-500 bg-teal-500/10 border-teal-500/20"
                      )}
                    >
                      <Languages className="w-4 h-4" />
                      <span className="text-2xl font-bold leading-none">
                        {tasks.filter(t => t.phase === phase).length}
                      </span>
                      <span className="text-xs opacity-80">
                        {phase === 'translation' ? 'Translation' : 'Adapting'}
                      </span>
                    </button>
                  );
                })}
              </div>

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
                    workspaceId={effectiveWorkspaceId}
                    workspaceName={currentWorkspace?.name || ''}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="calendar" className="mt-4">
              <div className="bg-card rounded-lg border p-4 min-h-[600px]">
                {tasksLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <LinguisticCalendarView
                    tasks={filteredTasks}
                    teamMemberMap={teamMemberMap}
                    onTaskClick={handleSelectTask}
                    workspaceId={effectiveWorkspaceId}
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

      <ChatWidget />
    </div>
  );
}
