import { useCallback } from 'react';
import { ExternalLink, FileCheck, FileX, MessageCircle, MessageSquare, User as UserIcon } from 'lucide-react';
import { LinguisticTask } from '@/hooks/useLinguisticTasks';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { RoleBasedOwnerCell } from '@/components/board/cells/RoleBasedOwnerCell';
import { User } from '@/types/board';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import DOMPurify from 'dompurify';

const PHASE_BADGE: Record<string, string> = {
  translation: 'bg-blue-200 text-blue-800',
  adapting: 'bg-teal-500 text-white',
};

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

const GUEST_SIGNAL_CONFIG: Record<string, { label: string; className: string; icon: typeof MessageCircle }> = {
  none: { label: 'No Activity', className: 'text-muted-foreground bg-muted', icon: UserIcon },
  waiting: { label: 'Waiting', className: 'text-amber-700 bg-amber-100', icon: MessageSquare },
  replied: { label: 'Replied', className: 'text-green-700 bg-green-100', icon: MessageCircle },
};

function stripHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
  return clean.replace(/&nbsp;/g, ' ').trim();
}

interface LinguisticTaskListProps {
  tasks: LinguisticTask[];
  onSelectTask: (taskId: string) => void;
  selectedTaskId: string | null;
  workspaceId: string | null;
}

export function LinguisticTaskList({ tasks, onSelectTask, selectedTaskId, workspaceId }: LinguisticTaskListProps) {
  const queryClient = useQueryClient();
  const { data: currentTeamMember } = useCurrentTeamMember();

  const handleOwnerChange = useCallback(async (taskId: string, field: 'traductor_id' | 'adaptador_id', user: User | undefined) => {
    const { error } = await supabase
      .from('tasks')
      .update({ [field]: user?.id || null, last_updated: new Date().toISOString() })
      .eq('id', taskId);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['linguistic-tasks', workspaceId] });
    }
  }, [queryClient, workspaceId]);

  const handleInstructionsComment = useCallback(async (taskId: string, comment: string, viewerIds: string[]) => {
    if (!currentTeamMember?.id) return;
    for (const viewerId of viewerIds) {
      await supabase.from('comments').insert({
        task_id: taskId,
        user_id: currentTeamMember.id,
        content: comment,
        is_guest_visible: true,
        viewer_id: viewerId,
        phase: null,
      });
    }
  }, [currentTeamMember?.id]);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FileCheck className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-lg font-medium">No active linguistic tasks</p>
        <p className="text-sm">All tasks in translation/adapting phases are completed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_100px_110px_90px_50px_110px_110px_100px_100px_120px_100px_40px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b">
        <span>Project</span>
        <span>Client</span>
        <span>Phase</span>
        <span>Status</span>
        <span>Due Date</span>
        <span>Ep.</span>
        <span>Translator</span>
        <span>Adapter</span>
        <span>Files</span>
        <span>Guest</span>
        <span>Latest Comment</span>
        <span>Updated</span>
        <span></span>
      </div>

      {/* Rows */}
      {tasks.map(task => {
        const guestConfig = GUEST_SIGNAL_CONFIG[task.guestSignal];
        const isOverdue = task.phaseDueDate && new Date(task.phaseDueDate) < new Date();

        return (
          <div
            key={task.id}
            className={cn(
              "w-full grid grid-cols-[1fr_100px_100px_110px_90px_50px_110px_110px_100px_100px_120px_100px_40px] gap-2 px-4 py-3 text-left rounded-lg transition-all hover:bg-muted/60",
              selectedTaskId === task.id && "bg-muted ring-1 ring-primary/20"
            )}
          >
            {/* Project + WO */}
            <button className="min-w-0 text-left" onClick={() => onSelectTask(task.id)}>
              <p className="text-sm font-medium truncate">{task.name}</p>
              {task.workOrderNumber && (
                <p className="text-xs text-muted-foreground">WO# {task.workOrderNumber}</p>
              )}
            </button>

            {/* Client */}
            <div className="text-sm text-muted-foreground truncate self-center">
              {task.clientName || '—'}
            </div>

            {/* Phase */}
            <div className="self-center">
              <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", PHASE_BADGE[task.phase] || 'bg-muted text-muted-foreground')}>
                {task.phase === 'translation' ? 'Translation' : 'Adapting'}
              </span>
            </div>

            {/* Status */}
            <div className="self-center">
              <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", STATUS_BADGE[task.status] || STATUS_BADGE.default)}>
                {STATUS_LABELS[task.status] || task.status}
              </span>
            </div>

            {/* Due Date */}
            <div className="self-center">
              {task.phaseDueDate ? (
                <span className={cn("text-xs font-medium", isOverdue ? "text-red-500" : "text-foreground")}>
                  {format(new Date(task.phaseDueDate), 'MMM d')}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>

            {/* Episodes */}
            <div className="self-center text-center">
              {task.cantidadEpisodios ? (
                <span className="text-xs font-medium">{task.cantidadEpisodios}</span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>

            {/* Translator - assignable */}
            <div className="self-center" onClick={e => e.stopPropagation()}>
              <RoleBasedOwnerCell
                owner={task.traductor}
                onOwnerChange={(user) => handleOwnerChange(task.id, 'traductor_id', user)}
                roleFilter="translator"
                onInstructionsComment={(comment, viewerIds) => handleInstructionsComment(task.id, comment, viewerIds)}
                taskId={task.id}
              />
            </div>

            {/* Adapter - assignable */}
            <div className="self-center" onClick={e => e.stopPropagation()}>
              <RoleBasedOwnerCell
                owner={task.adaptador}
                onOwnerChange={(user) => handleOwnerChange(task.id, 'adaptador_id', user)}
                roleFilter="adapter"
                onInstructionsComment={(comment, viewerIds) => handleInstructionsComment(task.id, comment, viewerIds)}
                taskId={task.id}
              />
            </div>

            {/* File readiness */}
            <div className="flex gap-1.5 self-center">
              <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                task.hasTranslatedFile ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              )}>
                {task.hasTranslatedFile ? <FileCheck className="w-3 h-3" /> : <FileX className="w-3 h-3" />}
                T
              </span>
              <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                task.hasAdaptedFile ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              )}>
                {task.hasAdaptedFile ? <FileCheck className="w-3 h-3" /> : <FileX className="w-3 h-3" />}
                A
              </span>
            </div>

            {/* Guest signal */}
            <div className="self-center">
              <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium", guestConfig.className)}>
                <guestConfig.icon className="w-3 h-3" />
                {guestConfig.label}
              </span>
            </div>

            {/* Latest comment */}
            <div className="self-center min-w-0">
              {task.latestComment ? (
                <div className="text-xs text-muted-foreground truncate" title={`${task.latestComment.authorName}: ${stripHtml(task.latestComment.content)}`}>
                  <span className="font-medium text-foreground">{task.latestComment.authorName.split(' ')[0]}: </span>
                  {stripHtml(task.latestComment.content).slice(0, 40)}{stripHtml(task.latestComment.content).length > 40 ? '…' : ''}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>

            {/* Last updated */}
            <div className="text-xs text-muted-foreground self-center">
              {task.lastUpdated ? formatDistanceToNow(task.lastUpdated, { addSuffix: true }) : '—'}
            </div>

            {/* Open icon */}
            <button className="self-center flex justify-center" onClick={() => onSelectTask(task.id)}>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
