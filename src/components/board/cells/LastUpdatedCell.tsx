import { formatDistanceToNow } from 'date-fns';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LastUpdatedCellProps {
  date?: Date | string;
  updatedBy?: string;
  isPrivate?: boolean;
}

export function LastUpdatedCell({ date, updatedBy, isPrivate = false }: LastUpdatedCellProps) {
  if (!date) {
    return (
      <span className="text-sm opacity-60">-</span>
    );
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const isValidDate = dateObj instanceof Date && !isNaN(dateObj.getTime());

  if (!isValidDate) {
    return (
      <span className="text-sm opacity-60">-</span>
    );
  }

  const relativeTime = formatDistanceToNow(dateObj, { addSuffix: true });

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium",
        isPrivate 
          ? "bg-white text-slate-800" 
          : "bg-slate-800 text-white"
      )}
      title={dateObj.toLocaleString()}
    >
      <Clock className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">{relativeTime}</span>
    </div>
  );
}
