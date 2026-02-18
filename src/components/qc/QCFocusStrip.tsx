import { AlertTriangle, Clock, FileX, UserX, UserCheck } from 'lucide-react';
import { QCTask } from '@/hooks/useQCTasks';
import { cn } from '@/lib/utils';

interface QCFocusStripProps {
  tasks: QCTask[];
  activeFilter: string | null;
  onFilterClick: (filter: string | null) => void;
}

export function isQCOverdue(task: QCTask): boolean {
  if (!task.phaseDueDate) return false;
  return new Date(task.phaseDueDate) < new Date();
}

export function isQCDueNext48h(task: QCTask): boolean {
  if (!task.phaseDueDate) return false;
  const due = new Date(task.phaseDueDate);
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  return due >= now && due <= in48h;
}

export function isQCMissingSubmission(task: QCTask): boolean {
  return task.submissionStatus === 'missing' || task.submissionStatus === 'blocked';
}

export function isQCWaitingOnVendor(task: QCTask): boolean {
  return task.guestSignal === 'waiting';
}

export function isQCNeedsAssignment(task: QCTask): boolean {
  return !task.assigneeId;
}

export function QCFocusStrip({ tasks, activeFilter, onFilterClick }: QCFocusStripProps) {
  const counters = [
    { key: 'overdue', label: 'Overdue', count: tasks.filter(isQCOverdue).length, icon: AlertTriangle, color: 'text-red-500 bg-red-500/10 border-red-500/20', activeColor: 'bg-red-500 text-white' },
    { key: 'due48h', label: 'Due 48h', count: tasks.filter(isQCDueNext48h).length, icon: Clock, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', activeColor: 'bg-amber-500 text-white' },
    { key: 'missingSubmission', label: 'Missing Submission', count: tasks.filter(isQCMissingSubmission).length, icon: FileX, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', activeColor: 'bg-orange-500 text-white' },
    { key: 'waitingVendor', label: 'Waiting on Vendor', count: tasks.filter(isQCWaitingOnVendor).length, icon: UserX, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20', activeColor: 'bg-purple-500 text-white' },
    { key: 'needsAssignment', label: 'Needs Assignment', count: tasks.filter(isQCNeedsAssignment).length, icon: UserCheck, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20', activeColor: 'bg-sky-500 text-white' },
  ];

  return (
    <>
      {counters.map(c => {
        const isActive = activeFilter === c.key;
        return (
          <button
            key={c.key}
            onClick={() => onFilterClick(isActive ? null : c.key)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm font-medium",
              isActive ? c.activeColor : c.color,
              "hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            <c.icon className="w-4 h-4" />
            <span className="text-xl font-bold leading-none">{c.count}</span>
            <span className="text-xs opacity-80">{c.label}</span>
          </button>
        );
      })}
    </>
  );
}
