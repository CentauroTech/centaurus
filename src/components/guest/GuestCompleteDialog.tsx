import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, MessageSquare, CheckCircle, Loader2, X, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCompleteGuestTask } from '@/hooks/useGuestTasks';
import { useUploadTaskFile } from '@/hooks/useTaskFiles';
import { useAddComment } from '@/hooks/useComments';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';

interface GuestCompleteDialogProps {
  taskId: string;
  taskName: string;
  phase?: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function GuestCompleteDialog({
  taskId,
  taskName,
  phase,
  isOpen,
  onClose,
  onComplete,
}: GuestCompleteDialogProps) {
  const [comment, setComment] = useState('');
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: currentMember } = useCurrentTeamMember();
  const completeTask = useCompleteGuestTask();
  const uploadFile = useUploadTaskFile(taskId);
  const addComment = useAddComment(taskId, '');

  const isSubmitting = completeTask.isPending || uploadFile.isPending || addComment.isPending;
  const hasContent = comment.trim() || droppedFile;

  // Determine file category based on phase
  const getFileCategory = () => {
    const normalizedPhase = phase?.toLowerCase() || '';
    if (normalizedPhase.includes('translat')) {
      return 'translated';
    }
    if (normalizedPhase.includes('adapt')) {
      return 'adapted';
    }
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
    if (file) {
      setDroppedFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDroppedFile(file);
    }
  };

  const removeFile = () => {
    setDroppedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleComplete = async () => {
    if (!hasContent) {
      toast.error('Please add a comment or upload a file before marking as done');
      return;
    }

    if (!currentMember?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      // Upload file if provided
      if (droppedFile) {
        const category = getFileCategory();
        await uploadFile.mutateAsync({
          file: droppedFile,
          category,
          isGuestAccessible: true,
        });
      }

      // Add comment if provided (to guest-visible communication)
      if (comment.trim()) {
        await addComment.mutateAsync({
          content: comment.trim(),
          userId: currentMember.id,
          mentionedUserIds: [],
          isGuestVisible: true,
        });
      }

      // Complete the task
      await completeTask.mutateAsync({
        taskId,
        deliveryComment: comment.trim() || (droppedFile ? `Delivered: ${droppedFile.name}` : undefined),
      });

      toast.success('Task completed successfully!');
      onComplete();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete task');
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setComment('');
      setDroppedFile(null);
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
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
            
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={removeFile}
                  disabled={isSubmitting}
                >
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
                  isDragOver 
                    ? "border-primary bg-primary/5" 
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
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

          {/* Separator */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs">or add a comment</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Comment Field */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              <MessageSquare className="w-4 h-4 inline mr-1.5" />
              Delivery Comment
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add notes about your delivery..."
              className="min-h-[80px] resize-none"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This comment will be visible in guest communication
            </p>
          </div>

          {/* Warning if no content */}
          {!hasContent && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-amber-700 dark:text-amber-400">
                Please upload a file or add a comment to complete this task
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleComplete}
              disabled={!hasContent || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Mark as Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
