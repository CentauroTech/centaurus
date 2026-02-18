import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, MessageSquare, CheckCircle, Loader2, X, AlertCircle, List } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUploadTaskFile } from '@/hooks/useTaskFiles';
import { useAddComment } from '@/hooks/useComments';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { QC_PHASE_RETAKE_LABEL } from '@/hooks/useQCTasks';

interface QCDoneModalProps {
  taskId: string;
  taskName: string;
  phase: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function QCDoneModal({ taskId, taskName, phase, isOpen, onClose, onComplete }: QCDoneModalProps) {
  const [comment, setComment] = useState('');
  const [retakeListText, setRetakeListText] = useState('');
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [submissionChoice, setSubmissionChoice] = useState<'file' | 'retake' | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: currentMember } = useCurrentTeamMember();
  const uploadFile = useUploadTaskFile(taskId);
  const addComment = useAddComment(taskId, '');

  const isQCRetakes = phase.toLowerCase().includes('retakes') && phase.toLowerCase().includes('qc');
  const hasComment = comment.trim().length > 0;
  const hasSubmission = droppedFile || retakeListText.trim().length > 0;
  const canSubmit = hasComment && hasSubmission;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { setDroppedFile(file); setSubmissionChoice('file'); }
  }, []);

  const handleComplete = async () => {
    if (!canSubmit || !currentMember?.id) {
      toast.error('Please add a comment AND (file or retake list)');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload file if provided
      if (droppedFile) {
        await uploadFile.mutateAsync({ file: droppedFile, category: 'delivery', isGuestAccessible: true });
      }

      // Build comment content
      let fullComment = comment.trim();

      // If retake list provided, append structured content with phase-specific label
      if (retakeListText.trim()) {
        const retakeLabel = QC_PHASE_RETAKE_LABEL[phase] || 'Retake List';
        const lines = retakeListText.split('\n').filter(l => l.trim());
        const bulletItems = lines.map(l => `<li><p>${l.trim()}</p></li>`).join('');
        fullComment += `\n<h3>${retakeLabel}</h3><ul data-submission="${phase}_retake_list">${bulletItems}</ul>`;
      }

      await addComment.mutateAsync({
        content: fullComment,
        userId: currentMember.id,
        mentionedUserIds: [],
        isGuestVisible: true,
        phase,
        viewerId: currentMember.id,
      });

      onComplete();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setComment('');
      setRetakeListText('');
      setDroppedFile(null);
      setSubmissionChoice(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Before marking Done…
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{taskName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Comment (required) */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              <MessageSquare className="w-4 h-4 inline mr-1.5" />
              Comment <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add notes about your QC review..."
              disabled={isSubmitting}
              className="min-h-[80px]"
            />
          </div>

          {/* Submission choice */}
          <div>
            <p className="text-sm font-medium mb-2">Choose one <span className="text-destructive">*</span></p>
            <div className="flex gap-2">
              <Button
                variant={submissionChoice === 'file' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSubmissionChoice('file')}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload File
              </Button>
              <Button
                variant={submissionChoice === 'retake' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSubmissionChoice('retake')}
                className="gap-2"
              >
                <List className="w-4 h-4" />
                Add {QC_PHASE_RETAKE_LABEL[phase] || 'Retake List'}
              </Button>
            </div>
          </div>

          {/* File upload */}
          {submissionChoice === 'file' && (
            <div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) setDroppedFile(e.target.files[0]); }} />
              {droppedFile ? (
                <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-green-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{droppedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(droppedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setDroppedFile(null)} disabled={isSubmitting}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
                  onDrop={handleDrop}
                  className={cn(
                    "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                    isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  )}
                >
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Drop file or click to upload</p>
                </div>
              )}
            </div>
          )}

          {/* Retake list */}
          {submissionChoice === 'retake' && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                <List className="w-4 h-4 inline mr-1.5" />
                {QC_PHASE_RETAKE_LABEL[phase] || 'Retake List'} (one item per line)
              </label>
              <Textarea
                value={retakeListText}
                onChange={e => setRetakeListText(e.target.value)}
                placeholder={"Scene 1: Character voice too low\nScene 3: Lip sync off by 2 frames\nScene 7: Background noise"}
                className="min-h-[120px] font-mono text-sm"
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Validation warning */}
          {!canSubmit && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-amber-700 dark:text-amber-400">
                {!hasComment ? 'Comment is required.' : 'Please upload a file or add a retake list.'}
                {isQCRetakes && !hasSubmission && ' (QC Retakes requires a submission)'}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleComplete} disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Mark as Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
