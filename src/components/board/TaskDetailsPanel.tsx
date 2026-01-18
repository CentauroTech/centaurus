import { useState, useRef, useMemo } from 'react';
import { X, Send, Paperclip, Smile, AtSign, FileText, Image, File, Clock, User as UserIcon, MessageSquare, Users, Rocket } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Task, Comment, TaskFile, ActivityItem, User } from '@/types/board';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { useComments, useAddComment, CommentWithUser } from '@/hooks/useComments';
import { useTeamMembers } from '@/hooks/useWorkspaces';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { useActivityLog, ActivityLogEntry } from '@/hooks/useActivityLog';
import { usePermissions } from '@/hooks/usePermissions';
import { useTaskFiles, useUploadTaskFile, useToggleFileAccessibility, useDeleteTaskFile, FILE_CATEGORIES, FileCategory } from '@/hooks/useTaskFiles';
import { FileCategorySection } from './files/FileCategorySection';
import { FileUploadButton } from './files/FileUploadButton';
import { CommentSection } from './comments/CommentSection';
import { RichTextEditor, RichTextDisplay } from './comments/RichTextEditor';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TaskDetailsPanelProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  boardId?: string;
  currentPhase?: string;
}

export function TaskDetailsPanel({ task, isOpen, onClose, users, boardId, currentPhase }: TaskDetailsPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
const [activeUpdateTab, setActiveUpdateTab] = useState<'team' | 'guest'>('team');
  const [kickoffBrief, setKickoffBrief] = useState(task.kickoff_brief || '');
  const [isEditingKickoff, setIsEditingKickoff] = useState(false);
  const [isSavingKickoff, setIsSavingKickoff] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { role, isAdmin } = usePermissions();
  const isGuest = role === 'guest';
  
  // Only fetch comments and activity when panel is open
  const { data: comments, isLoading: commentsLoading } = useComments(task.id, isOpen);
  const { data: activityLogs, isLoading: activityLoading } = useActivityLog(task.id, isOpen);
  const { data: teamMembers } = useTeamMembers();
  const { data: currentTeamMember } = useCurrentTeamMember();
  const addCommentMutation = useAddComment(task.id, boardId || '');
  
  // File hooks
  const { data: taskFiles, isLoading: filesLoading } = useTaskFiles(task.id, isOpen);
  const uploadFile = useUploadTaskFile(task.id);
  const toggleFileAccess = useToggleFileAccessibility(task.id);
  const deleteFile = useDeleteTaskFile(task.id);

  // Separate comments by visibility
  const { teamComments, guestComments } = useMemo(() => {
    if (!comments) return { teamComments: [], guestComments: [] };
    return {
      teamComments: comments.filter(c => !c.is_guest_visible),
      guestComments: comments.filter(c => c.is_guest_visible),
    };
  }, [comments]);

  // Group files by category
  const filesByCategory = useMemo(() => {
    if (!taskFiles) return {};
    return taskFiles.reduce((acc, file) => {
      const category = file.file_category || 'general';
      if (!acc[category]) acc[category] = [];
      acc[category].push(file);
      return acc;
    }, {} as Record<string, typeof taskFiles>);
  }, [taskFiles]);

  // Filter team members based on mention search
  const filteredMentionUsers = teamMembers?.filter(member => 
    mentionSearch === '' || member.name.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 6) || [];

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewComment(value);

    // Check if we're typing a mention
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setShowMentions(true);
      setMentionSearch(mentionMatch[1]);
      setMentionCursorPosition(cursorPos - mentionMatch[0].length);
    } else {
      setShowMentions(false);
      setMentionSearch('');
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    
    // Use the currently logged-in team member
    const currentUserId = currentTeamMember?.id;
    
    if (!currentUserId) {
      toast.error('You must be logged in to post comments');
      return;
    }

    // Parse mentions from the comment content - match @Name or @FirstName LastName
    const mentionPattern = /@([\w]+(?:\s[\w]+)?)/g;
    const mentionedNames: string[] = [];
    let match;
    while ((match = mentionPattern.exec(newComment)) !== null) {
      mentionedNames.push(match[1]);
    }

    // Find mentioned user IDs
    const mentionedUserIds: string[] = [];
    if (teamMembers && mentionedNames.length > 0) {
      for (const name of mentionedNames) {
        const member = teamMembers.find(m => 
          m.name.toLowerCase() === name.toLowerCase() ||
          m.name.toLowerCase().replace(/\s+/g, '') === name.toLowerCase().replace(/\s+/g, '')
        );
        if (member) {
          mentionedUserIds.push(member.id);
        }
      }
    }

    try {
      await addCommentMutation.mutateAsync({
        content: newComment.trim(),
        userId: currentUserId,
        mentionedUserIds,
      });
      setNewComment('');
      setShowMentions(false);
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  // Handler for the new CommentSection component
  const handleSendToSection = async (content: string, mentionedUserIds: string[], isGuestVisible: boolean) => {
    const currentUserId = currentTeamMember?.id;
    
    if (!currentUserId) {
      toast.error('You must be logged in to post comments');
      return;
    }

    try {
      await addCommentMutation.mutateAsync({
        content,
        userId: currentUserId,
        mentionedUserIds,
        isGuestVisible,
      });
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
      e.preventDefault();
      handleSendComment();
    }
    if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  const insertMention = (user: { id: string; name: string }) => {
    const textBeforeMention = newComment.substring(0, mentionCursorPosition);
    const textAfterCursor = newComment.substring(inputRef.current?.selectionStart || newComment.length);
    // Remove any partial @mention from after text
    const cleanAfterText = textAfterCursor.replace(/^@?\w*/, '');
    
    setNewComment(`${textBeforeMention}@${user.name} ${cleanAfterText}`);
    setShowMentions(false);
    setMentionSearch('');
    
    // Focus back on input
    setTimeout(() => {
      inputRef.current?.focus();
      const newCursorPos = textBeforeMention.length + user.name.length + 2;
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
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
              value="kickoff"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Kickoff
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
            {isGuest ? (
              // Guests only see guest-visible comments in a single section
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <CommentSection
                  title="Updates"
                  icon="guest"
                  comments={guestComments}
                  isLoading={commentsLoading}
                  onSendComment={handleSendToSection}
                  teamMembers={teamMembers || []}
                  isGuestVisible={true}
                  emptyMessage="No updates yet"
                />
              </div>
            ) : (
              // Team members see both sections
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex border-b border-border bg-muted/20">
                  <button
                    onClick={() => setActiveUpdateTab('team')}
                    className={cn(
                      "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                      activeUpdateTab === 'team' 
                        ? "border-b-2 border-primary text-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Users className="w-4 h-4 inline mr-2" />
                    Team Updates
                  </button>
                  <button
                    onClick={() => setActiveUpdateTab('guest')}
                    className={cn(
                      "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                      activeUpdateTab === 'guest' 
                        ? "border-b-2 border-primary text-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <UserIcon className="w-4 h-4 inline mr-2" />
                    Guest Communication
                  </button>
                </div>
                
                {activeUpdateTab === 'team' ? (
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    <CommentSection
                      title="Internal Team Updates"
                      icon="team"
                      comments={teamComments}
                      isLoading={commentsLoading}
                      onSendComment={handleSendToSection}
                      teamMembers={teamMembers || []}
                      isGuestVisible={false}
                      emptyMessage="No team updates yet"
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    <CommentSection
                      title="Guest Communication"
                      icon="guest"
                      comments={guestComments}
                      isLoading={commentsLoading}
                      onSendComment={handleSendToSection}
                      teamMembers={teamMembers || []}
                      isGuestVisible={true}
                      emptyMessage="No guest communication yet"
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="flex-1 m-0 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {taskFiles?.length || 0} file{(taskFiles?.length || 0) !== 1 ? 's' : ''}
              </span>
              {!isGuest && (
                <FileUploadButton
                  onUpload={async (file, category) => {
                    await uploadFile.mutateAsync({ 
                      file, 
                      category,
                      phase: currentPhase,
                      isGuestAccessible: false 
                    });
                  }}
                  isUploading={uploadFile.isPending}
                  currentPhase={currentPhase}
                />
              )}
            </div>
            <ScrollArea className="flex-1 p-4">
              {filesLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">Loading files...</p>
                </div>
              ) : taskFiles && taskFiles.length > 0 ? (
                <div className="space-y-6">
                  {FILE_CATEGORIES.map(cat => (
                    <FileCategorySection
                      key={cat.value}
                      title={cat.label}
                      files={filesByCategory[cat.value] || []}
                      isGuest={isGuest}
                      onToggleAccess={(fileId, isAccessible) => 
                        toggleFileAccess.mutate({ fileId, isGuestAccessible: isAccessible })
                      }
                      onDelete={(fileId) => deleteFile.mutate(fileId)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No files yet</p>
                  <p className="text-xs mt-1">Upload files to share with the team</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Kickoff Tab */}
          <TabsContent value="kickoff" className="flex-1 m-0 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto p-4">
              {isEditingKickoff && !isGuest ? (
                <div className="h-full flex flex-col">
                  <RichTextEditor
                    content={kickoffBrief}
                    onChange={setKickoffBrief}
                    placeholder="Enter the full brief/kickoff information..."
                    className="flex-1"
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setKickoffBrief(task.kickoff_brief || '');
                        setIsEditingKickoff(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={isSavingKickoff}
                      onClick={async () => {
                        setIsSavingKickoff(true);
                        try {
                          const { error } = await supabase
                            .from('tasks')
                            .update({ kickoff_brief: kickoffBrief } as any)
                            .eq('id', task.id);
                          
                          if (error) throw error;
                          toast.success('Kickoff brief saved');
                          setIsEditingKickoff(false);
                        } catch (error) {
                          toast.error('Failed to save kickoff brief');
                        } finally {
                          setIsSavingKickoff(false);
                        }
                      }}
                    >
                      {isSavingKickoff ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full">
                  {kickoffBrief ? (
                    <div 
                      className="cursor-pointer"
                      onClick={() => !isGuest && setIsEditingKickoff(true)}
                    >
                      <RichTextDisplay content={kickoffBrief} />
                    </div>
                  ) : (
                    <div 
                      className="text-center py-12 text-muted-foreground cursor-pointer"
                      onClick={() => !isGuest && setIsEditingKickoff(true)}
                    >
                      <Rocket className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No kickoff brief yet</p>
                      {!isGuest && (
                        <p className="text-xs mt-1">Click to add the full brief</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
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

// Helper to render comment content with styled mentions
function renderCommentWithMentions(content: string): React.ReactNode {
  // Match @Name or @FirstName LastName patterns
  const parts = content.split(/(@[\w]+(?:\s[\w]+)?)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={index} className="text-primary font-medium bg-primary/10 px-1 rounded">
          {part}
        </span>
      );
    }
    return part;
  });
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
          {renderCommentWithMentions(comment.content)}
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
