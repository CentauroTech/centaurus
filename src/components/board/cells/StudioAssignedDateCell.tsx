import { useState } from 'react';
import { format, isToday, isTomorrow, isValid } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface StudioAssignedDateCellProps {
  date?: Date | string;
  onDateChange: (date: string | undefined) => void;
  disabled?: boolean;
  isPrivate?: boolean;
  hasWorkOrder?: boolean;
  currentWorkOrder?: string;
  branchCode?: string;
  pmInitials?: string;
}

// Parse date string as local date (not UTC) to avoid timezone shift
function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
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

// Generate preview of what the new WO# would look like
function generateWOPreview(date: Date, branchCode?: string, pmInitials?: string): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const dateStr = `${month}${day}${year}`;
  
  const branch = branchCode || '??';
  const initials = pmInitials || '??';
  
  return `${branch}${initials}${dateStr}##`;
}

export function StudioAssignedDateCell({ 
  date, 
  onDateChange, 
  disabled = false, 
  isPrivate = false,
  hasWorkOrder = false,
  currentWorkOrder = '',
  branchCode = '',
  pmInitials = ''
}: StudioAssignedDateCellProps) {
  const [open, setOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | undefined>(undefined);
  const [showWarning, setShowWarning] = useState(false);

  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;
  const isValidDate = dateObj && isValid(dateObj);

  const formatDateDisplay = (d: Date) => {
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'MMM d');
  };

  const handleSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onDateChange(undefined);
      setOpen(false);
      return;
    }

    // If task has a work order and we're changing the date, show warning
    if (hasWorkOrder && isValidDate) {
      setPendingDate(selectedDate);
      setShowWarning(true);
      setOpen(false);
    } else {
      const dateString = formatDateForDB(selectedDate);
      onDateChange(dateString);
      setOpen(false);
    }
  };

  const handleConfirmChange = () => {
    if (pendingDate) {
      const dateString = formatDateForDB(pendingDate);
      onDateChange(dateString);
    }
    setPendingDate(undefined);
    setShowWarning(false);
  };

  const handleCancelChange = () => {
    setPendingDate(undefined);
    setShowWarning(false);
  };

  if (disabled) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded text-sm w-full opacity-60 cursor-not-allowed",
          isPrivate 
            ? (isValidDate ? "text-slate-200" : "text-slate-400")
            : (isValidDate ? "text-foreground" : "text-slate-400")
        )}
      >
        <CalendarIcon className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{isValidDate ? formatDateDisplay(dateObj) : 'No date'}</span>
      </div>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded text-sm transition-smooth w-full",
              isPrivate 
                ? "hover:bg-slate-700/50" 
                : "hover:bg-muted/50",
              isPrivate
                ? (isValidDate ? "text-slate-100" : "text-slate-400")
                : (isValidDate ? "text-foreground" : "text-slate-400")
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

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Work Order Format?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Changing the <strong>Studio Assigned</strong> date will update the Work Order (WO#) format.
              </p>
              {currentWorkOrder && (
                <p>
                  Current WO#: <code className="bg-muted px-1.5 py-0.5 rounded">{currentWorkOrder}</code>
                </p>
              )}
              {pendingDate && (
                <p>
                  New WO# will be: <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">{generateWOPreview(pendingDate, branchCode, pmInitials)}</code>
                </p>
              )}
              <p className="text-muted-foreground text-sm mt-2">
                Are you sure you want to change this date?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmChange}>
              Yes, Update Date & WO#
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
