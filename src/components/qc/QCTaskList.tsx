import { useCallback } from 'react';
import { ExternalLink } from 'lucide-react';
import { QCTask, QC_PHASE_LABELS, QC_PHASE_DUE_DATE_FIELD } from '@/hooks/useQCTasks';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { DateCell } from '@/components/board/DateCell';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

const STATUS_BADGE: Record<string, string> = {
  default: 'bg-muted text-muted-foreground',
  working: 'bg-status-working text-foreground',
  delayed: 'bg-status-stuck text-white',
  done: 'bg-status-done text-white',
  pending_approval: 'bg-amber-400 text-amber-900',
};

const STATUS_LABELS: Record<string, string> = {
  default: 'Not Started',
  working: 'Working on it',
  delayed: 'Delayed',
  done: 'Done',
  pending_approval: 'Pending',
};

const SUBMISSION_BADGE: Record<string, { label: string; className: string }> = {
  ready: { label: 'Ready', className: 'bg-green-100 text-green-700' },
  missing: { label: 'Missing', className: 'bg-gray-100 text-gray-500' },
  waiting: { label: 'Waiting', className: 'bg-amber-100 text-amber-700' },
  blocked: { label: 'Blocked', className: 'bg-red-100 text-red-700' },
};

const PHASE_BADGE: Record<string, string> = {
  qc_premix: 'bg-purple-200 text-purple-800',
  qc_retakes: 'bg-amber-200 text-amber-800',
  mix: 'bg-blue-300 text-blue-900',
  qc_mix: 'bg-purple-300 text-purple-900',
  mix_retakes: 'bg-pink-500 text-white',
};

function stripHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }).replace(/&nbsp;/g, ' ').trim();
}

interface QCTaskListProps {
  tasks: QCTask[];
  onSelectTask: (taskId: string) => void;
  selectedTaskId: string | null;
  workspaceIds: string[];
}

export function QCTaskList({ tasks, onSelectTask, selectedTaskId, workspaceIds }: QCTaskListProps) {
  const queryClient = useQueryClient();

  const handleFieldUpdate = useCallback(async (taskId: string, field: string, value: unknown) => {
    const { error } = await supabase.from('tasks').update({
      [field]: value,
      last_updated: new Date().toISOString(),
    }).eq('id', taskId);
    if (error) { toast.error('Failed to update'); return; }
    queryClient.invalidateQueries({ queryKey: ['qc-tasks', workspaceIds] });
  }, [queryClient, workspaceIds]);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">No active QC tasks</p>
        <p className="text-sm">All tasks in QC/Mix phases are completed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_90px_80px_100px_100px_90px_100px_120px_100px_40px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b">
        <span>Project</span>
        <span>Client</span>
        <span>Branch</span>
        <span>Stage</span>
        <span>Status</span>
        <span>Due Date</span>
        <span>Submission</span>
        <span>Latest Comment</span>
        <span>Updated</span>
        <span></span>
      </div>

      {tasks.map(task => {
        const submission = SUBMISSION_BADGE[task.submissionStatus];
        return (
          <div
            key={task.id}
            className={cn(
              "w-full grid grid-cols-[1fr_90px_80px_100px_100px_90px_100px_120px_100px_40px] gap-2 px-4 py-3 text-left rounded-lg transition-all hover:bg-muted/60",
              selectedTaskId === task.id && "bg-muted ring-1 ring-primary/20"
            )}
          >
            {/* Project + WO */}
            <div className="min-w-0 self-center">
              <button onClick={() => onSelectTask(task.id)} className="text-sm font-medium truncate block text-left hover:text-primary transition-colors">
                {task.name || 'Untitled'}
              </button>
              {task.workOrderNumber && (
                <p className="text-xs text-muted-foreground">WO# {task.workOrderNumber}</p>
              )}
            </div>

            {/* Client */}
            <div className="text-xs text-muted-foreground self-center truncate">{task.clientName || '—'}</div>

            {/* Branch */}
            <div className="self-center">
              <span className={cn("inline-flex px-2 py-0.5 rounded text-[10px] font-medium",
                task.branch === 'Miami' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
              )}>
                {task.branch}
              </span>
            </div>

            {/* Stage */}
            <div className="self-center">
              <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", PHASE_BADGE[task.phase] || 'bg-muted text-muted-foreground')}>
                {QC_PHASE_LABELS[task.phase] || task.phase}
              </span>
            </div>

            {/* Status */}
            <div className="self-center" onClick={e => e.stopPropagation()}>
              <select
                value={task.status}
                onChange={(e) => handleFieldUpdate(task.id, 'status', e.target.value)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium border-0 outline-none cursor-pointer appearance-none text-center",
                  STATUS_BADGE[task.status] || STATUS_BADGE.default
                )}
              >
                {['default', 'working', 'delayed', 'done'].map(opt => (
                  <option key={opt} value={opt}>{STATUS_LABELS[opt]}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="self-center" onClick={e => e.stopPropagation()}>
              <DateCell
                date={task.phaseDueDate || undefined}
                onDateChange={(val) => {
                  const field = QC_PHASE_DUE_DATE_FIELD[task.phase];
                  if (field) handleFieldUpdate(task.id, field, val || null);
                }}
              />
            </div>

            {/* Submission */}
            <div className="self-center">
              <span className={cn("inline-flex px-2 py-0.5 rounded text-[10px] font-medium", submission.className)}>
                {submission.label}
              </span>
            </div>

            {/* Latest Comment */}
            <div className="self-center min-w-0">
              {task.latestComment ? (
                <div className="text-xs text-muted-foreground truncate" title={stripHtml(task.latestComment.content)}>
                  <span className="font-medium text-foreground">{task.latestComment.authorName.split(' ')[0]}: </span>
                  {stripHtml(task.latestComment.content).slice(0, 30)}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>

            {/* Updated */}
            <div className="text-xs text-muted-foreground self-center">
              {task.lastUpdated ? formatDistanceToNow(task.lastUpdated, { addSuffix: true }) : '—'}
            </div>

            {/* Open */}
            <button className="self-center flex justify-center" onClick={() => onSelectTask(task.id)}>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
