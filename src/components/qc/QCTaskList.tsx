import { useCallback, useMemo } from 'react';
import { ExternalLink, HelpCircle, MessageCircle, MessageSquare, User as UserIcon } from 'lucide-react';
import { QCTask, QC_PHASE_LABELS, QC_PHASE_DUE_DATE_FIELD } from '@/hooks/useQCTasks';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { DateCell } from '@/components/board/DateCell';
import { RoleBasedOwnerCell } from '@/components/board/cells/RoleBasedOwnerCell';
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

const PHASE_BADGE: Record<string, string> = {
  qc_premix: 'bg-purple-200 text-purple-800',
  qc_retakes: 'bg-amber-200 text-amber-800',
  mix: 'bg-blue-300 text-blue-900',
  qc_mix: 'bg-purple-300 text-purple-900',
  mix_retakes: 'bg-pink-500 text-white',
};

const SUBMISSION_TYPE_LABELS: Record<string, string> = {
  qc_premix: 'Premix Retake List',
  qc_retakes: 'Retake List',
  qc_mix: 'Mix Retake List',
  mix: 'File Upload',
  mix_retakes: 'File Upload',
};

const SUBMISSION_BADGE: Record<string, { label: string; className: string }> = {
  ready: { label: 'Ready', className: 'bg-green-100 text-green-700' },
  missing: { label: 'Missing', className: 'bg-gray-100 text-gray-500' },
  waiting: { label: 'Waiting', className: 'bg-amber-100 text-amber-700' },
  blocked: { label: 'Blocked', className: 'bg-red-100 text-red-700' },
};

const GUEST_SIGNAL_CONFIG: Record<string, { label: string; className: string; icon: typeof MessageCircle }> = {
  none: { label: 'No Activity', className: 'text-muted-foreground bg-muted', icon: UserIcon },
  waiting: { label: 'Waiting', className: 'text-amber-700 bg-amber-100', icon: MessageSquare },
  replied: { label: 'Replied', className: 'text-green-700 bg-green-100', icon: MessageCircle },
};

function stripHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }).replace(/&nbsp;/g, ' ').trim();
}

interface QCTaskListProps {
  tasks: QCTask[];
  onSelectTask: (taskId: string) => void;
  selectedTaskId: string | null;
  workspaceIds: string[];
  teamMemberMap: Map<string, User>;
}

export function QCTaskList({ tasks, onSelectTask, selectedTaskId, workspaceIds, teamMemberMap }: QCTaskListProps) {
  const queryClient = useQueryClient();
  const { data: currentTeamMember } = useCurrentTeamMember();
  const { data: allTeamMembers = [] } = useTeamMembers();
  const sendGuestNotification = useSendGuestAssignmentNotification();

  const isGuestMember = useCallback((memberId: string): boolean => {
    const member = allTeamMembers.find(m => m.id === memberId);
    if (!member) return false;
    return !member.email || !member.email.toLowerCase().includes('@centauro.com');
  }, [allTeamMembers]);

  const episodeIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    const counters = new Map<string, number>();
    for (const task of tasks) {
      let groupKey: string;
      const wo = task.workOrderNumber || '';
      if (wo.length >= 3) {
        groupKey = wo.slice(0, -2);
      } else {
        groupKey = (task.name || '').replace(/\s*(S\d+|EP\d+|\d+)\s*$/i, '').trim();
      }
      const count = (counters.get(groupKey) || 0) + 1;
      counters.set(groupKey, count);
      map.set(task.id, count);
    }
    return map;
  }, [tasks]);

  const handleFieldUpdate = useCallback(async (taskId: string, field: string, value: unknown) => {
    const { error } = await supabase.from('tasks').update({
      [field]: value,
      last_updated: new Date().toISOString(),
    }).eq('id', taskId);
    if (error) { toast.error('Failed to update'); return; }
    queryClient.invalidateQueries({ queryKey: ['qc-tasks', workspaceIds] });
  }, [queryClient, workspaceIds]);

  const handleOwnerChange = useCallback(async (taskId: string, field: string, user: User | undefined) => {
    const updateData: Record<string, unknown> = {
      [field]: user?.id || null,
      last_updated: new Date().toISOString(),
    };

    if (user && isGuestMember(user.id)) {
      const guestDue = new Date();
      guestDue.setDate(guestDue.getDate() + 1);
      while (guestDue.getDay() === 0 || guestDue.getDay() === 6) {
        guestDue.setDate(guestDue.getDate() + 1);
      }
      updateData.is_private = true;
      updateData.guest_due_date = guestDue.toISOString().split('T')[0];
      updateData.date_assigned = getLocalDateString();

      const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);
      if (error) { toast.error('Failed to update'); return; }

      await supabase.from('task_viewers').delete().eq('task_id', taskId);
      await supabase.from('task_viewers').insert({ task_id: taskId, team_member_id: user.id });
      await supabase.from('task_files').update({ is_guest_accessible: true }).eq('task_id', taskId);

      sendGuestNotification.mutate({ taskId, taskName: 'QC Task', guestIds: [user.id] });

      await supabase.from('activity_log').insert({
        task_id: taskId,
        type: 'field_change',
        field: 'is_private',
        old_value: 'false',
        new_value: 'true',
        user_id: currentTeamMember?.id || null,
      });
    } else {
      const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);
      if (error) { toast.error('Failed to update'); return; }
    }

    queryClient.invalidateQueries({ queryKey: ['qc-tasks', workspaceIds] });
  }, [queryClient, workspaceIds, isGuestMember, currentTeamMember?.id, sendGuestNotification]);

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
        <p className="text-lg font-medium">No active QC tasks</p>
        <p className="text-sm">All tasks in QC/Mix phases are completed.</p>
      </div>
    );
  }

  const resolveUser = (id: string | null): User | undefined => {
    if (!id) return undefined;
    return teamMemberMap.get(id);
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap sticky left-0 z-20 bg-muted/30 min-w-[200px]">Project</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[90px] sticky left-[200px] z-20 bg-muted/30">Client</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[80px] sticky left-[290px] z-20 bg-muted/30 after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[3px] after:shadow-[2px_0_4px_rgba(0,0,0,0.08)]">Branch</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[120px]">Stage</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[100px]">Status</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[90px]">Due Date</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[50px]">Ep.</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[120px]">QC Premix</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[120px]">QC Retakes</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[120px]">Mixer</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[120px]">QC Mixer</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[120px]">Submission</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[100px]">
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
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[120px]">Vendor Comment</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[100px]">Updated</th>
            <th className="px-2 py-2 w-[40px]"></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => {
            const submission = SUBMISSION_BADGE[task.submissionStatus];
            const submissionType = SUBMISSION_TYPE_LABELS[task.phase] || 'Submission';
            const guestConfig = GUEST_SIGNAL_CONFIG[task.guestSignal];
            const epIndex = episodeIndexMap.get(task.id) ?? 1;

            return (
              <tr
                key={task.id}
                className={cn(
                  "border-b border-border/40 transition-all hover:bg-muted/60",
                  selectedTaskId === task.id && "bg-muted ring-1 ring-primary/20"
                )}
              >
                {/* Project + WO */}
                <td className="px-4 py-3 align-middle sticky left-0 z-10 bg-background min-w-[200px]">
                  <div className="min-w-0">
                    <button onClick={() => onSelectTask(task.id)} className="text-sm font-medium truncate block text-left hover:text-primary transition-colors">
                      {task.name || 'Untitled'}
                    </button>
                    {task.workOrderNumber && (
                      <p className="text-xs text-muted-foreground">WO# {task.workOrderNumber}</p>
                    )}
                  </div>
                </td>

                {/* Client */}
                <td className="px-2 py-3 align-middle sticky left-[200px] z-10 bg-background">
                  <span className="text-xs text-muted-foreground truncate block">{task.clientName || '—'}</span>
                </td>

                {/* Branch */}
                <td className="px-2 py-3 align-middle sticky left-[290px] z-10 bg-background after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[3px] after:shadow-[2px_0_4px_rgba(0,0,0,0.08)]">
                  <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium",
                    task.branch === 'Miami' ? 'bg-blue-200 text-blue-800' : 'bg-yellow-200 text-yellow-800'
                  )}>
                    {task.branch}
                  </span>
                </td>

                {/* Stage */}
                <td className="px-2 py-3 align-middle">
                  <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", PHASE_BADGE[task.phase] || 'bg-muted text-muted-foreground')}>
                    {QC_PHASE_LABELS[task.phase] || task.phase}
                  </span>
                </td>

                {/* Status */}
                <td className="px-2 py-3 align-middle" onClick={e => e.stopPropagation()}>
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
                </td>

                {/* Due Date */}
                <td className="px-2 py-3 align-middle" onClick={e => e.stopPropagation()}>
                  <DateCell
                    date={task.phaseDueDate || undefined}
                    onDateChange={(val) => {
                      const field = QC_PHASE_DUE_DATE_FIELD[task.phase];
                      if (field) handleFieldUpdate(task.id, field, val || null);
                    }}
                  />
                </td>

                {/* Episodes */}
                <td className="px-2 py-3 align-middle text-center text-sm">
                  {task.cantidadEpisodios ? `${epIndex}/${task.cantidadEpisodios}` : '—'}
                </td>

                {/* QC Premix (qc_1_id) */}
                <td className="px-2 py-3 align-middle" onClick={e => e.stopPropagation()}>
                  <RoleBasedOwnerCell
                    owner={resolveUser(task.qc1Id)}
                    onOwnerChange={(user) => handleOwnerChange(task.id, 'qc_1_id', user)}
                    roleFilter="qc_premix"
                    onInstructionsComment={(comment, viewerIds) => handleInstructionsComment(task.id, comment, viewerIds)}
                    taskId={task.id}
                    compact
                  />
                </td>

                {/* QC Retakes (qc_retakes_id) */}
                <td className="px-2 py-3 align-middle" onClick={e => e.stopPropagation()}>
                  <RoleBasedOwnerCell
                    owner={resolveUser(task.qcRetakesId)}
                    onOwnerChange={(user) => handleOwnerChange(task.id, 'qc_retakes_id', user)}
                    roleFilter="qc_retakes"
                    onInstructionsComment={(comment, viewerIds) => handleInstructionsComment(task.id, comment, viewerIds)}
                    taskId={task.id}
                    compact
                  />
                </td>

                {/* Mixer (mixer_bogota_id) */}
                <td className="px-2 py-3 align-middle" onClick={e => e.stopPropagation()}>
                  <RoleBasedOwnerCell
                    owner={resolveUser(task.mixerBogotaId)}
                    onOwnerChange={(user) => handleOwnerChange(task.id, 'mixer_bogota_id', user)}
                    roleFilter="mixer"
                    onInstructionsComment={(comment, viewerIds) => handleInstructionsComment(task.id, comment, viewerIds)}
                    taskId={task.id}
                    compact
                  />
                </td>

                {/* QC Mixer (qc_mix_id) */}
                <td className="px-2 py-3 align-middle" onClick={e => e.stopPropagation()}>
                  <RoleBasedOwnerCell
                    owner={resolveUser(task.qcMixId)}
                    onOwnerChange={(user) => handleOwnerChange(task.id, 'qc_mix_id', user)}
                    roleFilter="qc_mix"
                    onInstructionsComment={(comment, viewerIds) => handleInstructionsComment(task.id, comment, viewerIds)}
                    taskId={task.id}
                    compact
                  />
                </td>

                {/* Submission with type */}
                <td className="px-2 py-3 align-middle">
                  <div className="flex flex-col gap-0.5">
                    <span className={cn("inline-flex px-2 py-0.5 rounded text-[10px] font-medium", submission.className)}>
                      {submission.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground truncate">{submissionType}</span>
                  </div>
                </td>

                {/* Guest signal */}
                <td className="px-2 py-3 align-middle">
                  <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium", guestConfig.className)}>
                    <guestConfig.icon className="w-3 h-3" />
                    {guestConfig.label}
                  </span>
                </td>

                {/* Vendor Comment */}
                <td className="px-2 py-3 align-middle">
                  <div className="min-w-0">
                    {task.latestVendorComment ? (
                      <div className="text-xs text-muted-foreground truncate" title={stripHtml(task.latestVendorComment.content)}>
                        <span className="font-medium text-foreground">{task.latestVendorComment.authorName.split(' ')[0]}: </span>
                        {stripHtml(task.latestVendorComment.content).slice(0, 30)}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </td>

                {/* Updated */}
                <td className="px-2 py-3 align-middle">
                  <span className="text-xs text-muted-foreground">
                    {task.lastUpdated ? formatDistanceToNow(task.lastUpdated, { addSuffix: true }) : '—'}
                  </span>
                </td>

                {/* Open */}
                <td className="px-2 py-3 align-middle text-center">
                  <button onClick={() => onSelectTask(task.id)}>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
