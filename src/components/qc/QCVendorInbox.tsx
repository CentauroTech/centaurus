import { useMemo, useState } from 'react';
import { ExternalLink, FileText, MessageSquare, Upload, Filter } from 'lucide-react';
import { QCTask, QC_PHASE_LABELS } from '@/hooks/useQCTasks';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import DOMPurify from 'dompurify';

function stripHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }).replace(/&nbsp;/g, ' ').trim();
}

interface QCVendorInboxProps {
  tasks: QCTask[];
  onSelectTask: (taskId: string) => void;
  stageFilter: string;
}

export function QCVendorInbox({ tasks, onSelectTask, stageFilter }: QCVendorInboxProps) {
  const [keyOnly, setKeyOnly] = useState(true);
  const [showBlocked, setShowBlocked] = useState(false);

  const inboxItems = useMemo(() => {
    let filtered = tasks.filter(t => t.latestComment !== null || t.hasRetakeList || t.hasFileUpload);
    
    if (stageFilter !== 'all') {
      filtered = filtered.filter(t => t.phase === stageFilter);
    }

    if (keyOnly) {
      filtered = filtered.filter(t => t.hasRetakeList || t.hasFileUpload || t.latestComment?.isVendor);
    }

    if (!showBlocked) {
      filtered = filtered.filter(t => t.submissionStatus !== 'blocked');
    }

    // Sort by most recent activity
    return filtered.sort((a, b) => {
      const aTime = a.latestComment?.createdAt?.getTime() || 0;
      const bTime = b.latestComment?.createdAt?.getTime() || 0;
      return bTime - aTime;
    });
  }, [tasks, stageFilter, keyOnly, showBlocked]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Vendor Inbox</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="key-only" checked={keyOnly} onCheckedChange={setKeyOnly} />
            <Label htmlFor="key-only" className="text-xs">Key Submissions</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="show-blocked" checked={showBlocked} onCheckedChange={setShowBlocked} />
            <Label htmlFor="show-blocked" className="text-xs">Blocked</Label>
          </div>
        </div>
      </div>

      {inboxItems.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">No vendor submissions</div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {inboxItems.map(task => {
            const submissionType = task.hasRetakeList ? 'Retake List' : task.hasFileUpload ? 'File Upload' : 'Comment';
            const SubmissionIcon = task.hasRetakeList ? FileText : task.hasFileUpload ? Upload : MessageSquare;
            
            return (
              <div
                key={task.id}
                className="border rounded-lg p-3 hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => onSelectTask(task.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{task.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.workOrderNumber && (
                        <span className="text-[10px] text-muted-foreground">WO# {task.workOrderNumber}</span>
                      )}
                      <span className={cn("inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium",
                        task.branch === 'Miami' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                      )}>
                        {task.branch}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {QC_PHASE_LABELS[task.phase] || task.phase}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-1" />
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">
                    <SubmissionIcon className="w-3 h-3" />
                    {submissionType}
                  </span>
                  {task.assignee && (
                    <span className="text-[10px] text-muted-foreground">{task.assignee.name}</span>
                  )}
                  {task.latestComment && (
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {formatDistanceToNow(task.latestComment.createdAt, { addSuffix: true })}
                    </span>
                  )}
                </div>

                {task.latestComment && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {stripHtml(task.latestComment.content).slice(0, 80)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
