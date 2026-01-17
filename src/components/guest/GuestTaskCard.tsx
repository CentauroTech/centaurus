import { Clock, Calendar, FileText, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { GuestTask } from '@/hooks/useGuestTasks';

interface GuestTaskCardProps {
  task: GuestTask;
  onClick: () => void;
}

export function GuestTaskCard({ task, onClick }: GuestTaskCardProps) {
  const isDelayed = task.guestDueDate && 
    task.status !== 'done' && 
    new Date(task.guestDueDate) < new Date();

  const statusConfig = {
    default: { label: 'Not Started', className: 'bg-gray-500' },
    working: { label: 'Working on it', className: 'bg-amber-500' },
    done: { label: 'Done', className: 'bg-green-500' },
  };

  const normalizedStatus = 
    task.status === 'done' ? 'done' : 
    task.status === 'working' ? 'working' : 'default';

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        isDelayed && "border-red-500/50 bg-red-500/5"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Phase badge */}
            <Badge variant="outline" className="mb-2 text-xs">
              {task.currentPhase}
            </Badge>

            {/* Title */}
            <h3 className="font-semibold text-base truncate mb-1">
              {task.name || 'Untitled Project'}
            </h3>

            {/* Spanish title if available */}
            {task.tituloAprobadoEspanol && (
              <p className="text-sm text-muted-foreground truncate mb-2">
                {task.tituloAprobadoEspanol}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-3">
              {task.lockedRuntime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {task.lockedRuntime}
                </span>
              )}
              {task.cantidadEpisodios && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {task.cantidadEpisodios} ep
                </span>
              )}
              {task.guestDueDate && (
                <span className={cn(
                  "flex items-center gap-1",
                  isDelayed && "text-red-500 font-medium"
                )}>
                  {isDelayed && <AlertTriangle className="w-3.5 h-3.5" />}
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(task.guestDueDate), 'MMM d')}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Status badge */}
            <Badge 
              className={cn(
                "text-white",
                isDelayed && normalizedStatus !== 'done'
                  ? "bg-red-500"
                  : statusConfig[normalizedStatus].className
              )}
            >
              {isDelayed && normalizedStatus !== 'done' 
                ? 'Delayed' 
                : statusConfig[normalizedStatus].label}
            </Badge>

            {/* Arrow indicator */}
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
