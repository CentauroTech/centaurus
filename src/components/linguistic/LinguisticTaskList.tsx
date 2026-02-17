import { useCallback } from 'react';
import { ExternalLink, FileCheck, FileX, HelpCircle, MessageCircle, MessageSquare, User as UserIcon } from 'lucide-react';
import { LinguisticTask } from '@/hooks/useLinguisticTasks';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { RoleBasedOwnerCell } from '@/components/board/cells/RoleBasedOwnerCell';
import { TextCell } from '@/components/board/cells/TextCell';
import { NumberCell } from '@/components/board/cells/NumberCell';
import { DateCell } from '@/components/board/DateCell';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { User } from '@/types/board';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { useTeamMembers } from '@/hooks/useWorkspaces';
import { useSendGuestAssignmentNotification } from '@/hooks/useGuestNotifications';
import { getLocalDateString } from '@/lib/businessDays';
import { toast } from 'sonner';
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
  workspaceName: string;
}

export function LinguisticTaskList({ tasks, onSelectTask, selectedTaskId, workspaceId, workspaceName }: LinguisticTaskListProps) {
  const queryClient = useQueryClient();
  const { data: currentTeamMember } = useCurrentTeamMember();
  const { data: allTeamMembers = [] } = useTeamMembers();
  const sendGuestNotification = useSendGuestAssignmentNotification();

  const isGuestMember = useCallback((memberId: string): boolean => {
    const member = allTeamMembers.find(m => m.id === memberId);
    if (!member) return false;
    return !member.email || !member.email.toLowerCase().includes('@centauro.com');
  }, [allTeamMembers]);

  const isColombiaWorkspace = workspaceName.toLowerCase().includes('colombia') || workspaceName.toLowerCase().includes('col');

  const handleFieldUpdate = useCallback(async (taskId: string, field: string, value: unknown) => {
    const { error } = await supabase.from('tasks').update({
      [field]: value,
      last_updated: new Date().toISOString(),
    }).eq('id', taskId);
    if (error) { toast.error('Failed to update task'); return; }
    queryClient.invalidateQueries({ queryKey: ['linguistic-tasks', workspaceId] });
  }, [queryClient, workspaceId]);

  const handleOwnerChange = useCallback(async (task: LinguisticTask, field: 'traductor_id' | 'adaptador_id', user: User | undefined) => {
    const updateData: Record<string, unknown> = {
      [field]: user?.id || null,
      last_updated: new Date().toISOString(),
    };

    // If assigning a guest, apply the full privacy workflow
    if (user && isGuestMember(user.id)) {
      // Calculate next business day for guest_due_date
      const guestDue = new Date();
      guestDue.setDate(guestDue.getDate() + 1);
      while (guestDue.getDay() === 0 || guestDue.getDay() === 6) {
        guestDue.setDate(guestDue.getDate() + 1);
      }
      const guestDueStr = guestDue.toISOString().split('T')[0];
      const today = getLocalDateString();

      updateData.is_private = true;
      updateData.guest_due_date = guestDueStr;
      updateData.date_assigned = today;

      // For Colombia adapting phase, also set asignacion to Asignado
      if (isColombiaWorkspace && task.phase === 'adapting' && field === 'adaptador_id') {
        updateData.asignacion = 'Asignado';
      }

      const { error } = await supabase.from('tasks').update(updateData).eq('id', task.id);
      if (error) { toast.error('Failed to update task'); return; }

      // Clear existing viewers and add the new guest as viewer
      await supabase.from('task_viewers').delete().eq('task_id', task.id);
      await supabase.from('task_viewers').insert({ task_id: task.id, team_member_id: user.id });

      // Make all task files guest-accessible
      await supabase.from('task_files').update({ is_guest_accessible: true }).eq('task_id', task.id);

      // Send guest notification
      sendGuestNotification.mutate({
        taskId: task.id,
        taskName: task.name || 'Untitled Task',
        guestIds: [user.id],
      });

      // Log privacy change
      await supabase.from('activity_log').insert({
        task_id: task.id,
        type: 'field_change',
        field: 'is_private',
        old_value: 'false',
        new_value: 'true',
        user_id: currentTeamMember?.id || null,
      });
    } else {
      // Non-guest or removing assignment - just update the field
      const { error } = await supabase.from('tasks').update(updateData).eq('id', task.id);
      if (error) { toast.error('Failed to update task'); return; }
    }

    queryClient.invalidateQueries({ queryKey: ['linguistic-tasks', workspaceId] });
  }, [queryClient, workspaceId, isGuestMember, isColombiaWorkspace, currentTeamMember?.id, sendGuestNotification]);

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
      <div className="grid grid-cols-[1fr_100px_100px_110px_90px_50px_140px_140px_100px_100px_120px_100px_40px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b">
        <span>Project</span>
        <span>Client</span>
        <span>Phase</span>
        <span>Status</span>
        <span>Due Date</span>
        <span>Ep.</span>
        <span>Translator</span>
        <span>Adapter</span>
        <span>Files</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 cursor-help">Guest <HelpCircle className="w-3 h-3" /></span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs normal-case tracking-normal font-normal">
              Shows the latest guest-visible comment activity: <strong>No Activity</strong> = no comments, <strong>Waiting</strong> = internal reply sent, <strong>Replied</strong> = guest has responded.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
              "w-full grid grid-cols-[1fr_100px_100px_110px_90px_50px_140px_140px_100px_100px_120px_100px_40px] gap-2 px-4 py-3 text-left rounded-lg transition-all hover:bg-muted/60",
              selectedTaskId === task.id && "bg-muted ring-1 ring-primary/20"
            )}
          >
            {/* Project + WO */}
            <div className="min-w-0 self-center" onClick={e => e.stopPropagation()}>
              <TextCell
                value={task.name}
                onChange={(val) => handleFieldUpdate(task.id, 'name', val)}
                placeholder="Project name"
              />
              {task.workOrderNumber && (
                <p className="text-xs text-muted-foreground px-2.5">WO# {task.workOrderNumber}</p>
              )}
            </div>

            {/* Client */}
            <div className="self-center" onClick={e => e.stopPropagation()}>
              <TextCell
                value={task.clientName || ''}
                onChange={(val) => handleFieldUpdate(task.id, 'client_name', val || null)}
                placeholder="—"
              />
            </div>

            {/* Phase - read only */}
            <div className="self-center">
              <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", PHASE_BADGE[task.phase] || 'bg-muted text-muted-foreground')}>
                {task.phase === 'translation' ? 'Translation' : 'Adapting'}
              </span>
            </div>

            {/* Status - editable dropdown */}
            <div className="self-center" onClick={e => e.stopPropagation()}>
              {(() => {
                const statusKey = task.status;
                const statusOptions = ['default', 'working', 'delayed', 'done', 'pending_approval'];
                return (
                  <select
                    value={statusKey}
                    onChange={(e) => handleFieldUpdate(task.id, 'status', e.target.value)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium border-0 outline-none cursor-pointer appearance-none text-center",
                      STATUS_BADGE[statusKey] || STATUS_BADGE.default
                    )}
                  >
                    {statusOptions.map(opt => (
                      <option key={opt} value={opt}>{STATUS_LABELS[opt]}</option>
                    ))}
                  </select>
                );
              })()}
            </div>

            {/* Due Date - editable */}
            <div className="self-center" onClick={e => e.stopPropagation()}>
              <DateCell
                date={task.phaseDueDate || undefined}
                onDateChange={(val) => {
                  const field = task.phase === 'translation' ? 'translation_due_date' : 'adapting_due_date';
                  handleFieldUpdate(task.id, field, val || null);
                }}
              />
            </div>

            {/* Episodes - editable */}
            <div className="self-center text-center" onClick={e => e.stopPropagation()}>
              <NumberCell
                value={task.cantidadEpisodios ?? undefined}
                onChange={(val) => handleFieldUpdate(task.id, 'cantidad_episodios', val ?? null)}
                placeholder="—"
              />
            </div>

            {/* Translator - assignable */}
            <div className="self-center" onClick={e => e.stopPropagation()}>
              <RoleBasedOwnerCell
                owner={task.traductor}
                onOwnerChange={(user) => handleOwnerChange(task, 'traductor_id', user)}
                roleFilter="translator"
                onInstructionsComment={(comment, viewerIds) => handleInstructionsComment(task.id, comment, viewerIds)}
                taskId={task.id}
                compact
              />
            </div>

            {/* Adapter - assignable */}
            <div className="self-center" onClick={e => e.stopPropagation()}>
              <RoleBasedOwnerCell
                owner={task.adaptador}
                onOwnerChange={(user) => handleOwnerChange(task, 'adaptador_id', user)}
                roleFilter="adapter"
                onInstructionsComment={(comment, viewerIds) => handleInstructionsComment(task.id, comment, viewerIds)}
                taskId={task.id}
                compact
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
