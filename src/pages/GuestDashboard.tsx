import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LogOut, CheckCircle, Clock, AlertTriangle, Table, LayoutGrid, FileText, Hash, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import { Badge } from '@/components/ui/badge';
import { GuestTaskCard } from '@/components/guest/GuestTaskCard';
import { GuestTaskTable } from '@/components/guest/GuestTaskTable';
import { GuestTaskView } from '@/components/guest/GuestTaskView';
import { GuestCompleteDialog } from '@/components/guest/GuestCompleteDialog';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useGuestTasks, useUpdateGuestTask, GuestTask } from '@/hooks/useGuestTasks';
import { useGuestCompletedHistory } from '@/hooks/useGuestCompletedHistory';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { useAuth } from '@/hooks/useAuth';
import { getSignedFileUrl } from '@/hooks/useSignedUrl';
import { toast } from 'sonner';
import { format } from 'date-fns';
import centaurusLogo from '@/assets/centaurus-logo.jpeg';

export default function GuestDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signOut, user } = useAuth();
  const { data: currentMember } = useCurrentTeamMember();
  const { data: tasks, isLoading } = useGuestTasks();
  const { data: completedHistory, isLoading: historyLoading } = useGuestCompletedHistory();
  const updateTask = useUpdateGuestTask();

  const [selectedTask, setSelectedTask] = useState<GuestTask | null>(null);
  const [taskToComplete, setTaskToComplete] = useState<GuestTask | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Handle file download with signed URL
  const handleFileDownload = async (fileUrl: string, fileName: string, recordId: string) => {
    try {
      setDownloadingFileId(recordId);
      const signedUrl = await getSignedFileUrl(fileUrl);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error('Failed to download file');
    } finally {
      setDownloadingFileId(null);
    }
  };

  // Handle deep link from notifications
  useEffect(() => {
    const taskId = searchParams.get('task');
    if (taskId && tasks) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setSelectedTask(task);
      }
    }
  }, [searchParams, tasks]);

  // Sync selectedTask with fresh data when tasks update
  useEffect(() => {
    if (selectedTask && tasks) {
      const updatedTask = tasks.find(t => t.id === selectedTask.id);
      if (updatedTask && JSON.stringify(updatedTask) !== JSON.stringify(selectedTask)) {
        setSelectedTask(updatedTask);
      }
    }
  }, [tasks]);

  const activeTasks = tasks?.filter(t => t.status !== 'done') || [];
  const completedTasks = tasks?.filter(t => t.status === 'done') || [];
  const delayedTasks = activeTasks.filter(t => 
    t.guestDueDate && new Date(t.guestDueDate) < new Date()
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleStatusChange = async (taskId: string, status: 'default' | 'working' | 'done') => {
    if (status === 'done') {
      // Open complete dialog
      const task = tasks?.find(t => t.id === taskId);
      if (task) setTaskToComplete(task);
      return;
    }

    try {
      await updateTask.mutateAsync({ taskId, updates: { status } });
      toast.success('Status updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-16 items-center justify-between px-2 sm:px-4">
          <div className="flex items-center gap-3">
            <img 
              src={centaurusLogo} 
              alt="Centaurus" 
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h1 className="font-semibold">Centaurus</h1>
              <p className="text-xs text-muted-foreground">Guest Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            
            <div className="flex items-center gap-2 pl-3 border-l">
              <Avatar className="h-8 w-8">
                <AvatarFallback 
                  style={{ backgroundColor: currentMember?.color || '#888' }}
                  className="text-xs text-white"
                >
                  {currentMember?.initials || user?.email?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{currentMember?.name || 'Guest'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-2 sm:px-4 py-6 max-w-full">
        {/* Welcome & View Toggle */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Welcome back, {currentMember?.name?.split(' ')[0] || 'Guest'}!
            </h2>
            <p className="text-muted-foreground">
              Here are your assigned tasks. Complete them before their due dates.
            </p>
          </div>
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Toggle
              pressed={viewMode === 'table'}
              onPressedChange={() => setViewMode('table')}
              size="sm"
              aria-label="Table view"
            >
              <Table className="w-4 h-4" />
            </Toggle>
            <Toggle
              pressed={viewMode === 'cards'}
              onPressedChange={() => setViewMode('cards')}
              size="sm"
              aria-label="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </Toggle>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeTasks.length}</p>
                <p className="text-sm text-muted-foreground">Active Tasks</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{delayedTasks.length}</p>
                <p className="text-sm text-muted-foreground">Delayed</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedTasks.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Active ({activeTasks.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed ({completedHistory?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading tasks...
              </div>
            ) : activeTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">
                    You have no active tasks assigned. Check back later.
                  </p>
                </CardContent>
              </Card>
            ) : viewMode === 'table' ? (
              <GuestTaskTable
                tasks={activeTasks}
                onTaskClick={setSelectedTask}
                onStatusChange={handleStatusChange}
              />
            ) : (
              <div className="grid gap-4">
                {/* Delayed tasks first */}
                {delayedTasks.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-destructive mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Overdue ({delayedTasks.length})
                    </h3>
                    <div className="grid gap-3">
                      {delayedTasks.map(task => (
                        <GuestTaskCard
                          key={task.id}
                          task={task}
                          onClick={() => setSelectedTask(task)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other active tasks */}
                {activeTasks.filter(t => !delayedTasks.includes(t)).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      In Progress ({activeTasks.filter(t => !delayedTasks.includes(t)).length})
                    </h3>
                    <div className="grid gap-3">
                      {activeTasks
                        .filter(t => !delayedTasks.includes(t))
                        .map(task => (
                          <GuestTaskCard
                            key={task.id}
                            task={task}
                            onClick={() => setSelectedTask(task)}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Completed Tab - Permanent record for invoicing */}
          <TabsContent value="completed">
            {historyLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading completed tasks...
              </div>
            ) : !completedHistory || completedHistory.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No completed tasks</h3>
                  <p className="text-muted-foreground">
                    Your completed tasks will be permanently recorded here for invoicing.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  This is your permanent completion record for invoicing purposes. These records persist even after tasks move to the next phase.
                </p>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">WO#</th>
                        <th className="text-left p-3 font-medium">Project</th>
                        <th className="text-left p-3 font-medium">Phase</th>
                        <th className="text-left p-3 font-medium">Role</th>
                        <th className="text-left p-3 font-medium">Runtime</th>
                        <th className="text-left p-3 font-medium">Completed</th>
                        <th className="text-left p-3 font-medium">Delivered File</th>
                        <th className="text-left p-3 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {completedHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-muted/30">
                          <td className="p-3">
                            {record.workOrderNumber ? (
                              <div className="flex items-center gap-1">
                                <Hash className="w-3 h-3 text-muted-foreground" />
                                <span className="font-mono text-xs">{record.workOrderNumber}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{record.taskName}</p>
                              {record.tituloAprobadoEspanol && (
                                <p className="text-xs text-muted-foreground">{record.tituloAprobadoEspanol}</p>
                              )}
                              {record.workspaceName && (
                                <p className="text-xs text-muted-foreground">{record.workspaceName}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="secondary" className="text-xs">
                              {record.phase}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <span className="capitalize">{record.rolePerformed}</span>
                          </td>
                          <td className="p-3">
                            {record.lockedRuntime || '-'}
                          </td>
                          <td className="p-3">
                            <div>
                              <p>{format(new Date(record.completedAt), 'MMM d, yyyy')}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(record.completedAt), 'h:mm a')}
                              </p>
                            </div>
                          </td>
                          <td className="p-3">
                            {record.deliveryFileUrl && record.deliveryFileName ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 gap-1.5"
                                onClick={() => handleFileDownload(record.deliveryFileUrl!, record.deliveryFileName!, record.id)}
                                disabled={downloadingFileId === record.id}
                              >
                                {downloadingFileId === record.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                                <span className="text-xs truncate max-w-[80px]">
                                  {record.deliveryFileName}
                                </span>
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-3 max-w-[200px]">
                            {record.deliveryComment ? (
                              <p className="truncate text-muted-foreground" title={record.deliveryComment}>
                                {record.deliveryComment}
                              </p>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Task detail panel */}
      {selectedTask && (
        <GuestTaskView
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Complete task dialog */}
      {taskToComplete && (
        <GuestCompleteDialog
          taskId={taskToComplete.id}
          taskName={taskToComplete.name || 'Untitled'}
          phase={taskToComplete.fase}
          isOpen={!!taskToComplete}
          onClose={() => setTaskToComplete(null)}
          onComplete={() => setTaskToComplete(null)}
        />
      )}
    </div>
  );
}
