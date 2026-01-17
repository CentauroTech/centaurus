import { useState } from 'react';
import { X, Send, Clock, Calendar, FileText, Upload, MessageSquare, CheckCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GuestStatusBadge } from './GuestStatusBadge';
import { GuestTask } from '@/hooks/useGuestTasks';
import { useUpdateGuestTask, useCompleteGuestTask } from '@/hooks/useGuestTasks';
import { useComments, useAddComment } from '@/hooks/useComments';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { useTeamMembers } from '@/hooks/useWorkspaces';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GuestTaskViewProps {
  task: GuestTask;
  isOpen: boolean;
  onClose: () => void;
}

export function GuestTaskView({ task, isOpen, onClose }: GuestTaskViewProps) {
  const [newComment, setNewComment] = useState('');
  const [deliveryComment, setDeliveryComment] = useState('');
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);

  const { data: currentMember } = useCurrentTeamMember();
  const { data: teamMembers } = useTeamMembers();
  const { data: comments, isLoading: commentsLoading } = useComments(task.id, isOpen);
  const updateTask = useUpdateGuestTask();
  const completeTask = useCompleteGuestTask();
  const addComment = useAddComment(task.id, '');

  const handleStatusChange = async (status: 'default' | 'working' | 'done') => {
    if (status === 'done') {
      // Show delivery form instead of immediately marking done
      setShowDeliveryForm(true);
      return;
    }

    try {
      await updateTask.mutateAsync({ taskId: task.id, updates: { status } });
      toast.success('Status updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleComplete = async () => {
    if (!deliveryComment.trim()) {
      toast.error('Please add a delivery comment before marking as done');
      return;
    }

    try {
      await completeTask.mutateAsync({
        taskId: task.id,
        deliveryComment: deliveryComment.trim(),
      });
      toast.success('Task completed! You have been unassigned.');
      setShowDeliveryForm(false);
      setDeliveryComment('');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete task');
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !currentMember?.id) return;

    try {
      await addComment.mutateAsync({
        content: newComment.trim(),
        userId: currentMember.id,
        mentionedUserIds: [],
      });
      setNewComment('');
      toast.success('Comment sent');
    } catch (error) {
      toast.error('Failed to send comment');
    }
  };

  const isDone = task.status === 'done';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Badge variant="outline" className="mb-2">
                {task.currentPhase}
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

          {/* Project info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {task.lockedRuntime && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Runtime:</span>
                <span className="font-medium">{task.lockedRuntime}</span>
              </div>
            )}
            {task.cantidadEpisodios && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Episodes:</span>
                <span className="font-medium">{task.cantidadEpisodios}</span>
              </div>
            )}
            {task.dateAssigned && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Assigned:</span>
                <span className="font-medium">{format(new Date(task.dateAssigned), 'MMM d')}</span>
              </div>
            )}
            {task.guestDueDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Due:</span>
                <span className={cn(
                  "font-medium",
                  new Date(task.guestDueDate) < new Date() && task.status !== 'done' && "text-red-500"
                )}>
                  {format(new Date(task.guestDueDate), 'MMM d')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Delivery form */}
        {showDeliveryForm && !isDone && (
          <div className="p-4 border-b bg-green-500/5">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Complete Task
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Add a delivery comment or upload your files before marking as done.
            </p>
            <Textarea
              value={deliveryComment}
              onChange={(e) => setDeliveryComment(e.target.value)}
              placeholder="Add your delivery notes..."
              className="min-h-[80px] mb-3"
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowDeliveryForm(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-green-500 hover:bg-green-600"
                onClick={handleComplete}
                disabled={!deliveryComment.trim() || completeTask.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Done
              </Button>
            </div>
          </div>
        )}

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
            <ScrollArea className="flex-1 p-4">
              {commentsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading...
                </div>
              ) : comments && comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback 
                          style={{ backgroundColor: comment.user?.color || '#888' }}
                          className="text-xs text-white"
                        >
                          {comment.user?.initials || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {comment.user?.name || 'Unknown'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1">Start a conversation with the team</p>
                </div>
              )}
            </ScrollArea>

            {/* Comment input */}
            {!isDone && (
              <div className="p-4 border-t bg-card">
                <div className="relative">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Send a message to the team..."
                    className="min-h-[60px] pr-12 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendComment();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    className="absolute bottom-2 right-2 h-8 w-8"
                    onClick={handleSendComment}
                    disabled={!newComment.trim() || addComment.isPending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="files" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No files available</p>
                <p className="text-xs mt-1">Files shared by the team will appear here</p>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
