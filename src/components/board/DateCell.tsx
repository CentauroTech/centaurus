import { useState } from 'react';
import { format, isToday, isTomorrow, isPast, isValid, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface DateCellProps {
  date?: Date | string;
  onDateChange: (date: Date | undefined) => void;
}

export function DateCell({ date, onDateChange }: DateCellProps) {
  const [open, setOpen] = useState(false);

  // Handle both Date objects and string dates
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const isValidDate = dateObj && isValid(dateObj);

  const formatDateDisplay = (d: Date) => {
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'MMM d');
  };

  const isOverdue = isValidDate && isPast(dateObj) && !isToday(dateObj);

  const handleSelect = (selectedDate: Date | undefined) => {
    onDateChange(selectedDate);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-2 py-1 rounded text-sm transition-smooth hover:bg-muted w-full",
            isValidDate ? "text-foreground" : "text-muted-foreground",
            isOverdue && "text-destructive"
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
        />
      </PopoverContent>
    </Popover>
  );
}
