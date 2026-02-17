import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, MessageSquare, CheckCircle, Loader2, X, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUploadTaskFile } from '@/hooks/useTaskFiles';
import { useAddComment } from '@/hooks/useComments';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface InternalCompletionDialogProps {
  taskId: string;
  taskName: string;
  phase?: string;
  assignedMemberId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export function InternalCompletionDialog({
  taskId,
  taskName,
  phase,
  assignedMemberId,
  isOpen,
  onClose,
  onComplete,
}: InternalCompletionDialogProps) {
  const [comment, setComment] = useState('');
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: currentMember } = useCurrentTeamMember();
  const uploadFile = useUploadTaskFile(taskId);
  const addComment = useAddComment(taskId, '');

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-for-mentions'],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, initials, color')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const hasContent = comment.trim() || droppedFile;

  const getFileCategory = () => {
    const normalizedPhase = phase?.toLowerCase() || '';
    if (normalizedPhase.includes('translat')) return 'translated';
    if (normalizedPhase.includes('adapt')) return 'adapted';
    return 'delivery';
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setDroppedFile(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setDroppedFile(file);
  };

  const removeFile = () => {
    setDroppedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart || 0;
    setComment(value);
    setCursorPosition(position);

    const textBeforeCursor = value.slice(0, position);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
    setMentionSearch('');
  };

  const insertMention = (member: TeamMember) => {
    const textBeforeCursor = comment.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = comment.slice(cursorPosition);
    
    const newComment = comment.slice(0, lastAtIndex) + `@${member.name} ` + textAfterCursor;
    setComment(newComment);
    setShowMentions(false);
    setMentionSearch('');
    
    if (!mentionedUserIds.includes(member.id)) {
      setMentionedUserIds([...mentionedUserIds, member.id]);
    }
    
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  useEffect(() => {
    const handleClickOutside = () => setShowMentions(false);
    if (showMentions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMentions]);

  const handleComplete = async () => {
    if (!hasContent) {
      toast.error('Please add a comment or upload a file before marking as done');
      return;
    }
    if (!currentMember?.id) {
      toast.error('User not authenticated');
      return;
    }

    setIsSubmitting(true);
    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;

      // Upload file if provided
      if (droppedFile) {
        const category = getFileCategory();
        const result = await uploadFile.mutateAsync({
          file: droppedFile,
          category,
          isGuestAccessible: true,
        });
        // Extract the file URL from the upload result
        if (result) {
          fileUrl = (result as any).url || null;
          fileName = droppedFile.name;
        }
      }

      // Add comment if provided
      if (comment.trim()) {
        await addComment.mutateAsync({
          content: comment.trim(),
          userId: currentMember.id,
          mentionedUserIds,
          isGuestVisible: true,
          phase,
          viewerId: currentMember.id,
        });
      }

      // Record to guest_completed_tasks for the Entregados view
      // Fetch task data for the record
      const { data: taskData } = await supabase
        .from('tasks')
        .select('name, work_order_number, titulo_aprobado_espanol, locked_runtime, cantidad_episodios, branch, date_assigned')
        .eq('id', taskId)
        .single();

      // Get workspace name from the board
      const { data: boardData } = await supabase
        .from('tasks')
        .select('group_id')
        .eq('id', taskId)
        .single();

      let workspaceName: string | null = null;
      if (boardData?.group_id) {
        const { data: groupData } = await supabase
          .from('task_groups')
          .select('board_id')
          .eq('id', boardData.group_id)
          .single();
        if (groupData?.board_id) {
          const { data: bData } = await supabase
            .from('boards')
            .select('workspace_id')
            .eq('id', groupData.board_id)
            .single();
          if (bData?.workspace_id) {
            const { data: wsData } = await supabase
              .from('workspaces')
              .select('name')
              .eq('id', bData.workspace_id)
              .single();
            workspaceName = wsData?.name || null;
          }
        }
      }

      const rolePerformed = phase?.toLowerCase().includes('translat') ? 'Translator' : 'Adapter';

      await supabase.from('guest_completed_tasks').insert({
        task_id: taskId,
        team_member_id: assignedMemberId,
        task_name: taskData?.name || taskName,
        phase: phase || '',
        role_performed: rolePerformed,
        delivery_comment: comment.trim() || null,
        delivery_file_url: fileUrl,
        delivery_file_name: fileName,
        work_order_number: taskData?.work_order_number || null,
        titulo_aprobado_espanol: taskData?.titulo_aprobado_espanol || null,
        locked_runtime: taskData?.locked_runtime || null,
        cantidad_episodios: taskData?.cantidad_episodios || null,
        workspace_name: workspaceName,
        branch: taskData?.branch || null,
      });

      // Signal parent to proceed with the status change + phase progression
      onComplete();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setComment('');
      setDroppedFile(null);
      setMentionedUserIds([]);
      setShowMentions(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Complete Task
          </DialogTitle>
          <DialogDescription className="text-left">
            <span className="font-medium text-foreground">{taskName}</span>
            <br />
            Upload your completed file or add a comment before marking as done.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* File Drop Zone */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Upload Completed File
            </label>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
            
            {droppedFile ? (
              <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{droppedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(droppedFile.size / 1024).toFixed(1)} KB • Will be saved as "{getFileCategory()}"
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={removeFile} disabled={isSubmitting}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                  isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
                )}
              >
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Drop file here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your completed work will be attached to this task
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs">or add a comment</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Comment Field */}
          <div className="relative">
            <label className="text-sm font-medium mb-2 block">
              <MessageSquare className="w-4 h-4 inline mr-1.5" />
              Delivery Comment
            </label>
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={handleCommentChange}
              placeholder="Add notes about your delivery... Use @ to mention team members"
              className="w-full min-h-[80px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use @ to tag team members.
            </p>

            {showMentions && filteredMembers.length > 0 && (
              <div className="absolute z-50 w-full max-h-48 overflow-y-auto bg-popover border rounded-md shadow-lg mt-1" onClick={(e) => e.stopPropagation()}>
                {filteredMembers.slice(0, 8).map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left text-sm"
                    onClick={() => insertMention(member)}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback style={{ backgroundColor: member.color }} className="text-[10px] text-white">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span>{member.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {!hasContent && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-amber-700 dark:text-amber-400">
                Please upload a file or add a comment to complete this task
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleComplete} disabled={!hasContent || isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Mark as Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
