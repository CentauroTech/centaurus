import { useState } from 'react';
import { Clock, Calendar, FileText, MessageSquare, CheckCircle, Download, ExternalLink, Hash, Globe, Film, User, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GuestStatusBadge } from './GuestStatusBadge';
import { GuestCompleteDialog } from './GuestCompleteDialog';
import { GuestTask } from '@/hooks/useGuestTasks';
import { useUpdateGuestTask } from '@/hooks/useGuestTasks';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { useTaskFiles, FILE_CATEGORIES, TaskFileRecord } from '@/hooks/useTaskFiles';
import { getSignedFileUrl } from '@/hooks/useSignedUrl';
import { useCommentsRealtime } from '@/hooks/useRealtimeSubscriptions';
import CommentSection from '@/components/board/comments/CommentSection';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Parse date string as local date (not UTC) to avoid timezone shift
function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // months are 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

// Extract episode number from task name
const extractEpFromName = (name?: string): number => {
  if (!name) return 1;
  const match = name.match(/(?:ep(?:isode)?|e)\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : 1;
};

// Match main workspace phase colors
const PHASE_COLORS: Record<string, string> = {
  'On Hold': 'bg-gray-400 text-white',
  'Kickoff': 'bg-gray-900 text-white',
  'Assets': 'bg-cyan-200 text-cyan-800',
  'Translation': 'bg-blue-200 text-blue-800',
  'Adapting': 'bg-teal-500 text-white',
  'Casting': 'bg-yellow-400 text-yellow-900',
  'Recording': 'bg-red-800 text-white',
  'Premix': 'bg-pink-200 text-pink-800',
  'QC Premix': 'bg-purple-200 text-purple-800',
  'QC-Premix': 'bg-purple-200 text-purple-800',
  'Mix': 'bg-blue-300 text-blue-900',
  'Mixing': 'bg-blue-300 text-blue-900',
  'QC Mix': 'bg-purple-200 text-purple-800',
  'QC-Mix': 'bg-purple-200 text-purple-800',
  'Retakes': 'bg-purple-600 text-white',
  'Adaptation': 'bg-teal-500 text-white',
};

interface GuestTaskViewProps {
  task: GuestTask;
  isOpen: boolean;
  onClose: () => void;
}

export function GuestTaskView({ task, isOpen, onClose }: GuestTaskViewProps) {
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const { data: currentMember } = useCurrentTeamMember();
  const { data: taskFiles, isLoading: filesLoading } = useTaskFiles(task.id, isOpen);
  const updateTask = useUpdateGuestTask();

  // Real-time subscription for comments
  useCommentsRealtime(task.id, isOpen);

  // Filter to only guest-accessible files
  const guestFiles = taskFiles?.filter(f => f.is_guest_accessible) || [];
  
  // Group files by category
  const filesByCategory = guestFiles.reduce((acc, file) => {
    const category = file.file_category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(file);
    return acc;
  }, {} as Record<string, typeof guestFiles>);

  // Handle file download with signed URL
  const handleFileDownload = async (file: TaskFileRecord) => {
    try {
      setDownloadingFile(file.id);
      const signedUrl = await getSignedFileUrl(file.url);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error('Failed to download file');
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleStatusChange = async (status: 'default' | 'working' | 'done') => {
    if (status === 'done') {
      setShowCompleteDialog(true);
      return;
    }

    try {
      await updateTask.mutateAsync({ taskId: task.id, updates: { status } });
      toast.success('Status updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const isDone = task.status === 'done';

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <Badge 
                  className={cn(
                    "mb-2 text-xs rounded-md px-3 py-1",
                    PHASE_COLORS[task.fase] || PHASE_COLORS[task.currentPhase || ''] || 'bg-gray-200 text-gray-800'
                  )}
                >
                  {task.currentPhase || task.fase}
                </Badge>
                <SheetTitle className="text-lg font-semibold">
                  {task.name || 'Untitled Project'}
                </SheetTitle>
                {task.tituloAprobadoEspanol && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {task.tituloAprobadoEspanol}
                  </p>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Task Info Section - Expanded to show all fields */}
          <div className="p-4 border-b bg-muted/30 space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <GuestStatusBadge
                status={task.status}
                guestDueDate={task.guestDueDate}
                onChange={handleStatusChange}
                disabled={isDone}
              />
            </div>

            {/* All project info in grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {/* Work Order Number */}
              {task.workOrderNumber && (
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">WO#:</span>
                  <span className="font-medium font-mono">{task.workOrderNumber}</span>
                </div>
              )}
              
              {/* Runtime */}
              {(task.lockedRuntime || task.finalRuntime) && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Runtime:</span>
                  <span className="font-medium">{task.lockedRuntime || task.finalRuntime}</span>
                </div>
              )}
              
              {/* Episodes */}
              {task.cantidadEpisodios && (
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Episodes:</span>
                  <span className="font-medium">{extractEpFromName(task.name)}/{task.cantidadEpisodios}</span>
                </div>
              )}
              
              {/* Original Language */}
              {task.lenguajeOriginal && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Language:</span>
                  <span className="font-medium">{task.lenguajeOriginal}</span>
                </div>
              )}
              
              {/* Date Assigned */}
              {task.dateAssigned && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Assigned:</span>
                  <span className="font-medium">{format(parseLocalDate(task.dateAssigned), 'MMM d, yyyy')}</span>
                </div>
              )}
              
              {/* Due Date */}
              {task.guestDueDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Due:</span>
                  <span className={cn(
                    "font-medium",
                    parseLocalDate(task.guestDueDate) < new Date() && task.status !== 'done' && "text-destructive"
                  )}>
                    {format(parseLocalDate(task.guestDueDate), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              
              
              {/* Last Updated */}
              {task.lastUpdated && (
                <div className="flex items-center gap-2 col-span-2">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="font-medium text-muted-foreground">
                    {formatDistanceToNow(new Date(task.lastUpdated), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Completed message */}
          {isDone && (
            <div className="p-4 border-b bg-green-500/10">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Task Completed</span>
              </div>
              {task.deliveryComment && (
                <p className="text-sm text-muted-foreground mt-2">
                  Delivery note: {task.deliveryComment}
                </p>
              )}
              {task.completedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Completed {formatDistanceToNow(new Date(task.completedAt), { addSuffix: true })}
                </p>
              )}
            </div>
          )}

          {/* Comments/Communication */}
          <Tabs defaultValue="updates" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 h-12">
              <TabsTrigger 
                value="updates"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Communication
              </TabsTrigger>
              <TabsTrigger 
                value="files"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
              >
                <FileText className="w-4 h-4 mr-2" />
                Files
              </TabsTrigger>
            </TabsList>

            <TabsContent value="updates" className="flex-1 flex flex-col m-0 overflow-hidden">
              <CommentSection
                taskId={task.id}
                phase={task.fase}
                viewerId={currentMember?.id}
              />
            </TabsContent>

            <TabsContent value="files" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full p-4">
                {filesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading files...
                  </div>
                ) : guestFiles.length > 0 ? (
                  <div className="space-y-6">
                    {FILE_CATEGORIES.map(cat => {
                      const categoryFiles = filesByCategory[cat.value];
                      if (!categoryFiles?.length) return null;
                      
                      return (
                        <div key={cat.value}>
                          <h4 className="text-sm font-medium mb-2 text-muted-foreground">{cat.label}</h4>
                          <div className="space-y-2">
                            {categoryFiles.map(file => (
                              <div 
                                key={file.id}
                                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleFileDownload(file)}
                                    disabled={downloadingFile === file.id}
                                  >
                                    {downloadingFile === file.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <ExternalLink className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleFileDownload(file)}
                                    disabled={downloadingFile === file.id}
                                  >
                                    {downloadingFile === file.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Download className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No files available</p>
                    <p className="text-xs mt-1">Files shared by the team will appear here</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Complete Task Dialog */}
      <GuestCompleteDialog
        taskId={task.id}
        taskName={task.name || 'Untitled'}
        phase={task.fase}
        isOpen={showCompleteDialog}
        onClose={() => setShowCompleteDialog(false)}
        onComplete={onClose}
      />
    </>
  );
}
