import { Clock, Play, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/businessDays';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface TimeTrackedCellProps {
  startedAt?: string | null;
  completedAt?: string | null;
  isPrivate?: boolean;
}

export function TimeTrackedCell({ startedAt, completedAt, isPrivate }: TimeTrackedCellProps) {
  // Not started yet
  if (!startedAt) {
    return (
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1 text-xs",
        isPrivate ? "text-slate-400" : "text-muted-foreground"
      )}>
        <Clock className="w-3.5 h-3.5" />
        <span>Not started</span>
      </div>
    );
  }

  // In progress
  if (startedAt && !completedAt) {
    const duration = formatDuration(startedAt);
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 text-xs rounded-md",
              isPrivate 
                ? "bg-blue-500/20 text-blue-300" 
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            )}>
              <Play className="w-3.5 h-3.5 animate-pulse" />
              <span>{duration}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Started: {format(new Date(startedAt), 'MMM d, yyyy h:mm a')}</p>
            <p className="text-muted-foreground">In progress</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Completed
  if (startedAt && completedAt) {
    const duration = formatDuration(startedAt, completedAt);
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 text-xs rounded-md",
              isPrivate 
                ? "bg-green-500/20 text-green-300" 
                : "bg-green-500/10 text-green-600 dark:text-green-400"
            )}>
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{duration}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Started: {format(new Date(startedAt), 'MMM d, yyyy h:mm a')}</p>
            <p>Completed: {format(new Date(completedAt), 'MMM d, yyyy h:mm a')}</p>
            <p className="font-medium mt-1">Total: {duration}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
}
