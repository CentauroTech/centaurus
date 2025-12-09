import { format, isToday, isTomorrow, isPast, isValid } from 'date-fns';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateCellProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
}

export function DateCell({ date, onDateChange }: DateCellProps) {
  const formatDateDisplay = (d: Date) => {
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'MMM d');
  };

  const isOverdue = date && isValid(date) && isPast(date) && !isToday(date);

  return (
    <div className="relative">
      <input
        type="date"
        value={date && isValid(date) ? format(date, 'yyyy-MM-dd') : ''}
        onChange={(e) => {
          const newDate = e.target.value ? new Date(e.target.value) : undefined;
          onDateChange(newDate);
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded text-sm transition-smooth",
          date ? "text-foreground" : "text-muted-foreground",
          isOverdue && "text-destructive"
        )}
      >
        <Calendar className="w-4 h-4" />
        <span>{date && isValid(date) ? formatDateDisplay(date) : 'No date'}</span>
      </div>
    </div>
  );
}
