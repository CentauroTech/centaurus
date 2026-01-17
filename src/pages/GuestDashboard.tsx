import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LogOut, User, Bell, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GuestTaskCard } from '@/components/guest/GuestTaskCard';
import { GuestTaskView } from '@/components/guest/GuestTaskView';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useGuestTasks, GuestTask } from '@/hooks/useGuestTasks';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { useAuth } from '@/hooks/useAuth';
import centaurusLogo from '@/assets/centaurus-logo.jpeg';

export default function GuestDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signOut, user } = useAuth();
  const { data: currentMember } = useCurrentTeamMember();
  const { data: tasks, isLoading } = useGuestTasks();

  const [selectedTask, setSelectedTask] = useState<GuestTask | null>(null);

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

  const activeTasks = tasks?.filter(t => t.status !== 'done') || [];
  const completedTasks = tasks?.filter(t => t.status === 'done') || [];
  const delayedTasks = activeTasks.filter(t => 
    t.guestDueDate && new Date(t.guestDueDate) < new Date()
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between px-4">
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

      <main className="container px-4 py-6">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Welcome back, {currentMember?.name?.split(' ')[0] || 'Guest'}!
          </h2>
          <p className="text-muted-foreground">
            Here are your assigned tasks. Complete them before their due dates.
          </p>
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
              Completed ({completedTasks.length})
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
            ) : (
              <div className="grid gap-4">
                {/* Delayed tasks first */}
                {delayedTasks.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-red-500 mb-3 flex items-center gap-2">
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

          <TabsContent value="completed">
            {completedTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No completed tasks</h3>
                  <p className="text-muted-foreground">
                    Tasks you complete will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {completedTasks.map(task => (
                  <GuestTaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setSelectedTask(task)}
                  />
                ))}
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
    </div>
  );
}
