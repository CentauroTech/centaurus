import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Shield, Sparkles, X, Inbox, LogOut, Settings, Globe } from 'lucide-react';
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
import { useAccessibleWorkspaces } from '@/hooks/useAccessibleWorkspaces';
import { useCanAccessFeature } from '@/hooks/useFeatureSettings';
import { useQCTasks, QC_PHASES, QC_PHASE_LABELS } from '@/hooks/useQCTasks';
import { QCTaskList } from '@/components/qc/QCTaskList';
import { QCVendorInbox } from '@/components/qc/QCVendorInbox';
import { QCAITab } from '@/components/qc/QCAITab';
import { QCFocusStrip, isQCOverdue, isQCDueNext48h, isQCMissingSubmission, isQCWaitingOnVendor, isQCNeedsAssignment } from '@/components/qc/QCFocusStrip';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const BRANCH_OPTIONS = ['all', 'Miami', 'Colombia'] as const;

export default function QCControlCenter() {
  const navigate = useNavigate();
  const { canAccess, isLoading: accessLoading } = useCanAccessFeature('qc_control_center');
  const { data: workspaces, isLoading: wsLoading } = useAccessibleWorkspaces();
  const { data: sidebarWorkspaces } = useWorkspaces();
  const { user, signOut } = useAuth();
  const { data: currentTeamMember } = useCurrentTeamMember();
  const { language, updateLanguage } = useLanguagePreference();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Filters
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [focusFilter, setFocusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');

  // Filter workspaces based on branch selection
  const filteredWorkspaces = useMemo(() => {
    if (!workspaces) return [];
    const excluded = ['Estudios Externos', 'Admin', 'Tutorial System'];
    const filtered = workspaces.filter(ws => !excluded.includes(ws.name));
    if (branchFilter === 'all') return filtered;
    return filtered.filter(ws => ws.name.toLowerCase().includes(branchFilter.toLowerCase()));
  }, [workspaces, branchFilter]);

  const workspaceIds = useMemo(() => filteredWorkspaces.map(w => w.id), [filteredWorkspaces]);

  const { data: qcData, isLoading: tasksLoading } = useQCTasks(workspaceIds);
  const tasks = qcData?.tasks || [];
  const teamMemberMap = qcData?.teamMemberMap || new Map<string, User>();

  // Apply filters
  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (stageFilter !== 'all') {
      result = result.filter(t => t.phase === stageFilter);
    }

    if (branchFilter !== 'all') {
      result = result.filter(t => t.branch === branchFilter);
    }

    if (assignedToMe && currentTeamMember?.id) {
      result = result.filter(t => t.assigneeId === currentTeamMember.id);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.workOrderNumber?.toLowerCase().includes(q) ||
        t.clientName?.toLowerCase().includes(q)
      );
    }

    if (focusFilter === 'overdue') result = result.filter(isQCOverdue);
    else if (focusFilter === 'due48h') result = result.filter(isQCDueNext48h);
    else if (focusFilter === 'missingSubmission') result = result.filter(isQCMissingSubmission);
    else if (focusFilter === 'waitingVendor') result = result.filter(isQCWaitingOnVendor);
    else if (focusFilter === 'needsAssignment') result = result.filter(isQCNeedsAssignment);

    return result;
  }, [tasks, stageFilter, branchFilter, searchQuery, focusFilter, assignedToMe, currentTeamMember?.id]);

  // Build Task for TaskDetailsPanel
  const selectedTask = useMemo((): Task | null => {
    if (!selectedTaskId) return null;
    const qt = tasks.find(t => t.id === selectedTaskId);
    if (!qt) return null;
    return {
      id: qt.id,
      name: qt.name,
      status: qt.status as any,
      branch: qt.branch,
      clientName: qt.clientName,
      workOrderNumber: qt.workOrderNumber,
      fase: qt.phase as any,
      currentPhase: qt.phase,
      projectManager: qt.projectManager,
      groupId: qt.groupId,
      lastUpdated: qt.lastUpdated || undefined,
      phaseDueDate: qt.phaseDueDate || undefined,
    } as Task;
  }, [selectedTaskId, tasks]);

  const handleSelectTask = useCallback((taskId: string) => setSelectedTaskId(taskId), []);
  const handleSelectBoard = useCallback(() => navigate('/'), [navigate]);

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

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar workspaces={sidebarWorkspaces || []} selectedBoardId={null} onSelectBoard={handleSelectBoard} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background border-b">
          <div className="px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-purple-600" />
                <div>
                  <h1 className="text-xl font-display font-bold">QC Control Center</h1>
                  <p className="text-xs text-muted-foreground">Quality Control & Mix Phase Management</p>
                </div>
              </div>

              {/* Branch filter chips */}
              <div className="ml-4 flex gap-1">
                {BRANCH_OPTIONS.map(branch => (
                  <button
                    key={branch}
                    onClick={() => setBranchFilter(branch)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                      branchFilter === branch
                        ? "bg-purple-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {branch === 'all' ? 'All' : branch}
                  </button>
                ))}
              </div>

              {/* Stage filter chips */}
              <div className="flex gap-1">
                <button
                  onClick={() => setStageFilter('all')}
                  className={cn("px-2 py-1 rounded-full text-[11px] font-medium transition-colors",
                    stageFilter === 'all' ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >All</button>
                {QC_PHASES.map(phase => (
                  <button
                    key={phase}
                    onClick={() => setStageFilter(stageFilter === phase ? 'all' : phase)}
                    className={cn("px-2 py-1 rounded-full text-[11px] font-medium transition-colors",
                      stageFilter === phase ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {QC_PHASE_LABELS[phase]}
                  </button>
                ))}
              </div>

              {/* Toggle assigned to me */}
              <div className="flex items-center gap-2">
                <Switch id="assigned-me" checked={assignedToMe} onCheckedChange={setAssignedToMe} />
                <Label htmlFor="assigned-me" className="text-xs whitespace-nowrap">My QC Work</Label>
              </div>

              {/* Search */}
              <div className="ml-auto relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-9 h-9 text-sm" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              <NotificationBell />

              {/* Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium hover:opacity-90 transition-opacity">
                    {currentTeamMember?.initials || user?.email?.substring(0, 2).toUpperCase() || 'U'}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-xs text-muted-foreground cursor-default">{user?.email}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />Notification Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateLanguage.mutate(language === 'en' ? 'es' : 'en')} disabled={updateLanguage.isPending}>
                    <Globe className="mr-2 h-4 w-4" />
                    {language === 'en' ? '🇪🇸 Cambiar a Español' : '🇺🇸 Switch to English'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />Sign out
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
                <Shield className="w-4 h-4" />
                Tasks ({filteredTasks.length})
              </TabsTrigger>
              <TabsTrigger value="inbox" className="gap-2">
                <Inbox className="w-4 h-4" />
                Vendor Inbox
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2">
                <Sparkles className="w-4 h-4" />
                AI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-4 mt-4">
              <div className="flex items-center gap-3 flex-wrap">
                <QCFocusStrip tasks={tasks} activeFilter={focusFilter} onFilterClick={setFocusFilter} />
              </div>

              <div className="bg-card rounded-lg border">
                {tasksLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <QCTaskList
                    tasks={filteredTasks}
                    onSelectTask={handleSelectTask}
                    selectedTaskId={selectedTaskId}
                    workspaceIds={workspaceIds}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="inbox" className="mt-4">
              <div className="bg-card rounded-lg border p-4">
                <QCVendorInbox tasks={tasks} onSelectTask={handleSelectTask} stageFilter={stageFilter} />
              </div>
            </TabsContent>

            <TabsContent value="ai" className="mt-4">
              <div className="bg-card rounded-lg border p-6">
                <QCAITab tasks={tasks} onSelectTask={handleSelectTask} />
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {selectedTask && (
          <TaskDetailsPanel
            task={selectedTask}
            isOpen={!!selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
            users={Array.from(teamMemberMap.values())}
          />
        )}
      </div>

      <ChatWidget />
    </div>
  );
}
