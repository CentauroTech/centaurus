import { useState } from 'react';
import { format, isToday, isTomorrow, isPast, isValid } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface DateCellProps {
  date?: Date | string;
  onDateChange: (date: string | undefined) => void;
}

// Parse date string as local date (not UTC) to avoid timezone shift
function parseLocalDate(dateStr: string): Date {
  // Handle ISO date strings like "2026-01-23" or "2026-01-23T00:00:00"
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // months are 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

// Format date as YYYY-MM-DD string for database storage
function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DateCell({ date, onDateChange }: DateCellProps) {
  const [open, setOpen] = useState(false);

  // Handle both Date objects and string dates - parse strings as local dates
  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;
  const isValidDate = dateObj && isValid(dateObj);

  const formatDateDisplay = (d: Date) => {
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'MMM d');
  };

  const isOverdue = isValidDate && isPast(dateObj) && !isToday(dateObj);

  const handleSelect = (selectedDate: Date | undefined) => {
    // Convert to YYYY-MM-DD string to avoid timezone issues
    const dateString = selectedDate ? formatDateForDB(selectedDate) : undefined;
    onDateChange(dateString);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-2 py-1 rounded text-sm transition-smooth hover:bg-muted/50 w-full",
            isValidDate ? "text-inherit" : "text-slate-400",
            isOverdue && "text-red-400"
          )}
        >
          <CalendarIcon className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{isValidDate ? formatDateDisplay(dateObj) : 'No date'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[100]" align="start">
        <Calendar
          mode="single"
          selected={isValidDate ? dateObj : undefined}
          onSelect={handleSelect}
          initialFocus
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
