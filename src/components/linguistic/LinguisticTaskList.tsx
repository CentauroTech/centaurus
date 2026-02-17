import { ExternalLink, FileCheck, FileX, MessageCircle, MessageSquare, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LinguisticTask } from '@/hooks/useLinguisticTasks';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

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

interface LinguisticTaskListProps {
  tasks: LinguisticTask[];
  onSelectTask: (taskId: string) => void;
  selectedTaskId: string | null;
}

export function LinguisticTaskList({ tasks, onSelectTask, selectedTaskId }: LinguisticTaskListProps) {
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
      <div className="grid grid-cols-[1fr_100px_100px_110px_90px_90px_90px_100px_100px_100px_40px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b">
        <span>Project</span>
        <span>Client</span>
        <span>Phase</span>
        <span>Status</span>
        <span>Due Date</span>
        <span>Translator</span>
        <span>Adapter</span>
        <span>Files</span>
        <span>Guest</span>
        <span>Updated</span>
        <span></span>
      </div>

      {/* Rows */}
      {tasks.map(task => {
        const guestConfig = GUEST_SIGNAL_CONFIG[task.guestSignal];
        const isOverdue = task.phaseDueDate && new Date(task.phaseDueDate) < new Date();

        return (
          <button
            key={task.id}
            onClick={() => onSelectTask(task.id)}
            className={cn(
              "w-full grid grid-cols-[1fr_100px_100px_110px_90px_90px_90px_100px_100px_100px_40px] gap-2 px-4 py-3 text-left rounded-lg transition-all hover:bg-muted/60",
              selectedTaskId === task.id && "bg-muted ring-1 ring-primary/20"
            )}
          >
            {/* Project + WO */}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{task.name}</p>
              {task.workOrderNumber && (
                <p className="text-xs text-muted-foreground">WO# {task.workOrderNumber}</p>
              )}
            </div>

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

            {/* Translator */}
            <div className="self-center">
              {task.traductor ? (
                <span
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: task.traductor.color }}
                  title={task.traductor.name}
                >
                  {task.traductor.initials}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>

            {/* Adapter */}
            <div className="self-center">
              {task.adaptador ? (
                <span
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: task.adaptador.color }}
                  title={task.adaptador.name}
                >
                  {task.adaptador.initials}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>


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

            {/* Last updated */}
            <div className="text-xs text-muted-foreground self-center">
              {task.lastUpdated ? formatDistanceToNow(task.lastUpdated, { addSuffix: true }) : '—'}
            </div>

            {/* Open icon */}
            <div className="self-center flex justify-center">
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
