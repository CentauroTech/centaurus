import { AlertTriangle, Clock, FileX, UserX } from 'lucide-react';
import { LinguisticTask } from '@/hooks/useLinguisticTasks';
import { cn } from '@/lib/utils';

interface TodaysFocusStripProps {
  tasks: LinguisticTask[];
  activeFilter: string | null;
  onFilterClick: (filter: string | null) => void;
}

function isOverdue(task: LinguisticTask): boolean {
  if (!task.phaseDueDate) return false;
  return new Date(task.phaseDueDate) < new Date();
}

function isDueNext48h(task: LinguisticTask): boolean {
  if (!task.phaseDueDate) return false;
  const due = new Date(task.phaseDueDate);
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  return due >= now && due <= in48h;
}

function isMissingFile(task: LinguisticTask): boolean {
  if (task.phase === 'translation') return !task.hasTranslatedFile;
  if (task.phase === 'adapting') return !task.hasAdaptedFile;
  return false;
}

function isWaitingOnGuest(task: LinguisticTask): boolean {
  return task.guestSignal === 'waiting' || task.guestSignal === 'none';
}

export function TodaysFocusStrip({ tasks, activeFilter, onFilterClick }: TodaysFocusStripProps) {
  const overdue = tasks.filter(isOverdue).length;
  const due48h = tasks.filter(isDueNext48h).length;
  const missingFile = tasks.filter(isMissingFile).length;
  const waitingGuest = tasks.filter(t => t.guestSignal === 'waiting').length;

  const counters = [
    { key: 'overdue', label: 'Overdue', count: overdue, icon: AlertTriangle, color: 'text-red-500 bg-red-500/10 border-red-500/20', activeColor: 'bg-red-500 text-white' },
    { key: 'due48h', label: 'Due 48h', count: due48h, icon: Clock, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', activeColor: 'bg-amber-500 text-white' },
    { key: 'missingFile', label: 'Missing File', count: missingFile, icon: FileX, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', activeColor: 'bg-orange-500 text-white' },
    { key: 'waitingGuest', label: 'Waiting on Guest', count: waitingGuest, icon: UserX, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20', activeColor: 'bg-purple-500 text-white' },
  ];

  return (
    <div className="flex gap-3 flex-wrap">
      {counters.map(c => {
        const isActive = activeFilter === c.key;
        return (
          <button
            key={c.key}
            onClick={() => onFilterClick(isActive ? null : c.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all text-sm font-medium",
              isActive ? c.activeColor : c.color,
              "hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            <c.icon className="w-4 h-4" />
            <span className="text-2xl font-bold leading-none">{c.count}</span>
            <span className="text-xs opacity-80">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Export filter functions for use in parent
export { isOverdue, isDueNext48h, isMissingFile, isWaitingOnGuest };
