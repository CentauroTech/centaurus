import { useState, useRef } from 'react';
import { X, Send, Paperclip, Smile, AtSign, FileText, Image, File, Clock, User as UserIcon, MessageSquare } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Task, Comment, TaskFile, ActivityItem, User } from '@/types/board';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { useComments, useAddComment } from '@/hooks/useComments';
import { useTeamMembers } from '@/hooks/useWorkspaces';
import { useActivityLog, ActivityLogEntry } from '@/hooks/useActivityLog';
import { toast } from 'sonner';

interface TaskDetailsPanelProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  boardId?: string;
}

export function TaskDetailsPanel({ task, isOpen, onClose, users, boardId }: TaskDetailsPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Only fetch comments and activity when panel is open
  const { data: comments, isLoading: commentsLoading } = useComments(task.id, isOpen);
  const { data: activityLogs, isLoading: activityLoading } = useActivityLog(task.id, isOpen);
  const { data: teamMembers } = useTeamMembers();
  const addCommentMutation = useAddComment(task.id, boardId || '');

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    
    // Use the first team member as the current user (in a real app, this would be the logged-in user)
    const currentUserId = teamMembers?.[0]?.id;
    
    if (!currentUserId) {
      toast.error('No user available to post comment');
      return;
    }

    try {
      await addCommentMutation.mutateAsync({
        content: newComment.trim(),
        userId: currentUserId,
      });
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  const insertMention = (user: User) => {
    setNewComment(prev => prev + `@${user.name} `);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold truncate pr-4">
              {task.name}
            </SheetTitle>
          </div>
        </SheetHeader>

        <Tabs defaultValue="updates" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4 h-12">
            <TabsTrigger 
              value="updates" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Updates
            </TabsTrigger>
            <TabsTrigger 
              value="files"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
            >
              <FileText className="w-4 h-4 mr-2" />
              Files
            </TabsTrigger>
            <TabsTrigger 
              value="activity"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
            >
              <Clock className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Updates Tab */}
          <TabsContent value="updates" className="flex-1 flex flex-col m-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {commentsLoading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">Loading comments...</p>
                  </div>
                ) : comments && comments.length > 0 ? (
                  comments.map((comment) => (
                    <DatabaseCommentItem key={comment.id} comment={comment} />
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No updates yet</p>
                    <p className="text-xs mt-1">Be the first to add an update</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Comment Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write an update..."
                  className="w-full min-h-[80px] p-3 pr-24 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowMentions(!showMentions)}
                  >
                    <AtSign className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Smile className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleSendComment}
                    disabled={!newComment.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>

                {/* Mentions Dropdown */}
                {showMentions && (
                  <div className="absolute bottom-full mb-2 left-0 w-48 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                    {users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => insertMention(user)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-sm text-left"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback style={{ backgroundColor: user.color }} className="text-xs text-white">
                            {user.initials}
                          </AvatarFallback>
                        </Avatar>
                        {user.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full p-4">
              {task.files && task.files.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {task.files.map((file) => (
                    <FileItem key={file.id} file={file} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No files yet</p>
                  <p className="text-xs mt-1">Files shared in updates will appear here</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full p-4">
              {activityLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">Loading activity...</p>
                </div>
              ) : activityLogs && activityLogs.length > 0 ? (
                <div className="space-y-4">
                  {activityLogs.map((item) => (
                    <DatabaseActivityItem key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No activity yet</p>
                  <p className="text-xs mt-1">Task activity will be logged here</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function DatabaseCommentItem({ comment }: { comment: { id: string; content: string; created_at: string; user: { id: string; name: string; initials: string; color: string } | null } }) {
  const user = comment.user || { name: 'Unknown', initials: '?', color: 'hsl(0, 0%, 50%)' };
  
  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback style={{ backgroundColor: user.color }} className="text-xs text-white">
          {user.initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{user.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <div className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
          {comment.content}
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback style={{ backgroundColor: comment.user.color }} className="text-xs text-white">
          {comment.user.initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{comment.user.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
          </span>
        </div>
        <div className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
          {comment.content}
        </div>
        {comment.attachments && comment.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {comment.attachments.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 px-2 py-1 rounded bg-muted text-xs"
              >
                {file.type === 'image' ? (
                  <Image className="w-3 h-3" />
                ) : (
                  <File className="w-3 h-3" />
                )}
                <span className="truncate max-w-[120px]">{file.name}</span>
              </div>
            ))}
          </div>
        )}
        {comment.reactions && comment.reactions.length > 0 && (
          <div className="mt-2 flex gap-1">
            {comment.reactions.map((reaction, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs"
              >
                {reaction.emoji} {reaction.userIds.length}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FileItem({ file }: { file: TaskFile }) {
  const getFileIcon = () => {
    switch (file.type) {
      case 'image':
        return <Image className="w-8 h-8 text-primary" />;
      case 'document':
        return <FileText className="w-8 h-8 text-orange-500" />;
      default:
        return <File className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col items-center p-4 rounded-lg border border-border hover:bg-accent/50 transition-smooth cursor-pointer">
      {getFileIcon()}
      <span className="mt-2 text-xs font-medium text-center truncate w-full">{file.name}</span>
      <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
    </div>
  );
}

function DatabaseActivityItem({ item }: { item: ActivityLogEntry }) {
  const getActivityMessage = () => {
    const field = item.field || '';
    const oldVal = item.old_value;
    const newVal = item.new_value;

    switch (item.type) {
      case 'phase_change':
        return (
          <>
            moved to phase{' '}
            <span className="font-medium">{newVal}</span>
            {oldVal && (
              <>
                {' '}from <span className="font-medium">{oldVal}</span>
              </>
            )}
          </>
        );
      case 'field_change':
        if (field === 'board') {
          return (
            <>
              moved from{' '}
              <span className="font-medium">{oldVal}</span> to{' '}
              <span className="font-medium">{newVal}</span>
            </>
          );
        }
        if (field === 'date_assigned') {
          return (
            <>
              date assigned set to{' '}
              <span className="font-medium">{newVal}</span>
            </>
          );
        }
        if (field === 'date_delivered') {
          return (
            <>
              date delivered set to{' '}
              <span className="font-medium">{newVal}</span>
            </>
          );
        }
        if (field === 'people') {
          return (
            <>
              assigned <span className="font-medium">{newVal}</span>
            </>
          );
        }
        return (
          <>
            changed <span className="font-medium">{field}</span>
            {oldVal && (
              <>
                {' '}from <span className="font-medium">{oldVal}</span>
              </>
            )}
            {newVal && (
              <>
                {' '}to <span className="font-medium">{newVal}</span>
              </>
            )}
          </>
        );
      default:
        return (
          <>
            {field && <span className="font-medium">{field}</span>} updated
          </>
        );
    }
  };

  const user = item.user || { name: 'System', initials: 'S', color: 'hsl(0, 0%, 50%)' };

  return (
    <div className="flex gap-3 text-sm">
      <Avatar className="h-6 w-6 shrink-0 mt-0.5">
        <AvatarFallback style={{ backgroundColor: user.color }} className="text-xs text-white">
          {user.initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-foreground/90">
          <span className="font-medium">{user.name}</span>{' '}
          {getActivityMessage()}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {format(new Date(item.created_at), 'MMM d, yyyy • h:mm a')}
        </p>
      </div>
    </div>
  );
}

function ActivityLogItem({ item }: { item: ActivityItem }) {
  const getActivityMessage = () => {
    switch (item.type) {
      case 'created':
        return 'created this task';
      case 'status_change':
        return (
          <>
            changed status from{' '}
            <span className="font-medium">{item.details.oldValue}</span> to{' '}
            <span className="font-medium">{item.details.newValue}</span>
          </>
        );
      case 'priority_change':
        return (
          <>
            changed priority from{' '}
            <span className="font-medium">{item.details.oldValue}</span> to{' '}
            <span className="font-medium">{item.details.newValue}</span>
          </>
        );
      case 'owner_change':
        return (
          <>
            assigned to <span className="font-medium">{item.details.newValue || 'no one'}</span>
          </>
        );
      case 'due_date_change':
        return (
          <>
            changed due date to{' '}
            <span className="font-medium">{item.details.newValue}</span>
          </>
        );
      case 'name_change':
        return (
          <>
            renamed from{' '}
            <span className="font-medium">{item.details.oldValue}</span> to{' '}
            <span className="font-medium">{item.details.newValue}</span>
          </>
        );
      case 'comment':
        return 'added a comment';
      case 'file_upload':
        return (
          <>
            uploaded <span className="font-medium">{item.details.fileName}</span>
          </>
        );
      default:
        return 'made an update';
    }
  };

  return (
    <div className="flex gap-3 text-sm">
      <Avatar className="h-6 w-6 shrink-0 mt-0.5">
        <AvatarFallback style={{ backgroundColor: item.user.color }} className="text-xs text-white">
          {item.user.initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-foreground/90">
          <span className="font-medium">{item.user.name}</span>{' '}
          {getActivityMessage()}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {format(item.timestamp, 'MMM d, yyyy • h:mm a')}
        </p>
      </div>
    </div>
  );
}
