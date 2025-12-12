import { useState, useRef } from 'react';
import { format, isToday, isTomorrow, isPast, isValid, parseISO } from 'date-fns';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateCellProps {
  date?: Date | string;
  onDateChange: (date: Date | undefined) => void;
}

export function DateCell({ date, onDateChange }: DateCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle both Date objects and string dates
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const isValidDate = dateObj && isValid(dateObj);

  const formatDateDisplay = (d: Date) => {
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'MMM d');
  };

  const isOverdue = isValidDate && isPast(dateObj) && !isToday(dateObj);

  const handleClick = () => {
    inputRef.current?.showPicker();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      // Create date at noon to avoid timezone issues
      const [year, month, day] = value.split('-').map(Number);
      const newDate = new Date(year, month - 1, day, 12, 0, 0);
      onDateChange(newDate);
    } else {
      onDateChange(undefined);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="date"
        value={isValidDate ? format(dateObj, 'yyyy-MM-dd') : ''}
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded text-sm transition-smooth hover:bg-muted w-full",
          isValidDate ? "text-foreground" : "text-muted-foreground",
          isOverdue && "text-destructive"
        )}
      >
        <Calendar className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{isValidDate ? formatDateDisplay(dateObj) : 'No date'}</span>
      </button>
    </div>
  );
}
