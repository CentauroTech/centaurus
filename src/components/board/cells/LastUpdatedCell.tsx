import { formatDistanceToNow } from 'date-fns';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LastUpdatedCellProps {
  date?: Date | string;
  updatedBy?: string;
}

export function LastUpdatedCell({ date, updatedBy }: LastUpdatedCellProps) {
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
    <div className="flex items-center gap-1.5 text-sm text-inherit opacity-80">
      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate" title={dateObj.toLocaleString()}>
        {relativeTime}
      </span>
    </div>
  );
}
