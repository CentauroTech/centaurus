import { MessageSquare, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GuestTask } from '@/hooks/useGuestTasks';
import { GuestStatusBadge } from './GuestStatusBadge';
import { GuestFileCell } from './GuestFileCell';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// Parse date string as local date (not UTC) to avoid timezone shift
function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // months are 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

interface GuestTaskTableProps {
  tasks: GuestTask[];
  onTaskClick: (task: GuestTask) => void;
  onStatusChange: (taskId: string, status: 'default' | 'working' | 'done') => void;
  episodeIndexMap?: Map<string, number>;
}

const PHASE_LABELS: Record<string, string> = {
  pre_production: 'Pre-Production',
  production: 'Production',
  post_production: 'Post-Production',
  delivery: 'Delivery',
  Translation: 'Translation',
  Adaptation: 'Adaptation',
  'QC Premix': 'QC Premix',
  Recording: 'Recording',
  Mixing: 'Mixing',
  'QC Mix': 'QC Mix',
};

// Match main workspace phase colors
const PHASE_COLORS: Record<string, string> = {
  'On Hold': 'bg-gray-400 text-white',
  'Kickoff': 'bg-gray-900 text-white',
  'Assets': 'bg-cyan-200 text-cyan-800',
  'Translation': 'bg-blue-200 text-blue-800',
  'Adapting': 'bg-teal-500 text-white',
  'Casting': 'bg-yellow-400 text-yellow-900',
  'Recording': 'bg-red-800 text-white',
  'Premix': 'bg-pink-200 text-pink-800',
  'QC Premix': 'bg-purple-200 text-purple-800',
  'QC-Premix': 'bg-purple-200 text-purple-800',
  'Mix': 'bg-blue-300 text-blue-900',
  'Mixing': 'bg-blue-300 text-blue-900',
  'QC Mix': 'bg-purple-200 text-purple-800',
  'QC-Mix': 'bg-purple-200 text-purple-800',
  'Retakes': 'bg-purple-600 text-white',
  'QC-Retakes': 'bg-amber-200 text-amber-800',
  'Mix Retakes': 'bg-pink-500 text-white',
  'Client Retakes': 'bg-amber-700 text-white',
  'Final Delivery': 'bg-green-500 text-white',
  'Adaptation': 'bg-teal-500 text-white',
};

// Helper to check if phase is Translation
const isTranslationPhase = (fase?: string): boolean => {
  if (!fase) return false;
  const normalized = fase.toLowerCase();
  return normalized === 'translation' || normalized.includes('translat');
};


export function GuestTaskTable({ tasks, onTaskClick, onStatusChange, episodeIndexMap }: GuestTaskTableProps) {
  // Check if any task is NOT in translation phase (to show File to Adapt column)
  const hasNonTranslationTasks = tasks.some(task => !isTranslationPhase(task.fase));

  return (
    <TooltipProvider>
      <div className="border rounded-lg bg-card overflow-hidden">
        {/* Scroll hint message */}
        <div className="flex justify-end px-4 py-2 border-b bg-muted/20">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            Scroll to the right for more information
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
        
        {/* Horizontal scroll container with visible scrollbar */}
        <div className="overflow-x-auto custom-scrollbar">
          <Table className="min-w-max">
            <TableHeader className="sticky top-0 z-40">
              <TableRow className="hover:bg-transparent">
                {/* Sticky columns - z-50 to stay above everything */}
                <TableHead 
                  className="font-semibold whitespace-nowrap sticky left-0 z-50 bg-slate-100 dark:bg-slate-800 w-[100px] min-w-[100px]"
                >
                  Phase
                </TableHead>
                <TableHead 
                  className="font-semibold whitespace-nowrap sticky z-50 bg-slate-100 dark:bg-slate-800 w-[100px] min-w-[100px]"
                  style={{ left: '100px' }}
                >
                  WO#
                </TableHead>
                <TableHead 
                  className="font-semibold whitespace-nowrap sticky z-50 bg-slate-100 dark:bg-slate-800 w-[120px] min-w-[120px]"
                  style={{ left: '200px' }}
                >
                  File to Translate
                </TableHead>
                <TableHead 
                  className="font-semibold whitespace-nowrap sticky z-50 bg-slate-100 dark:bg-slate-800 w-[280px] min-w-[280px] border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]"
                  style={{ left: '320px' }}
                >
                  Original Title
                </TableHead>
                
                {/* Scrollable columns */}
                {hasNonTranslationTasks && (
                  <TableHead className="font-semibold whitespace-nowrap bg-slate-100 dark:bg-slate-800">File to Adapt</TableHead>
                )}
                <TableHead className="font-semibold whitespace-nowrap bg-slate-100 dark:bg-slate-800">Spanish Title</TableHead>
                <TableHead className="font-semibold whitespace-nowrap bg-slate-100 dark:bg-slate-800">Runtime</TableHead>
                <TableHead className="font-semibold whitespace-nowrap text-center bg-slate-100 dark:bg-slate-800">Episodes</TableHead>
                <TableHead className="font-semibold whitespace-nowrap bg-slate-100 dark:bg-slate-800">Date Assigned</TableHead>
                <TableHead className="font-semibold whitespace-nowrap bg-slate-100 dark:bg-slate-800">Due Date</TableHead>
                <TableHead className="font-semibold whitespace-nowrap bg-slate-100 dark:bg-slate-800">Status</TableHead>
                <TableHead className="font-semibold whitespace-nowrap bg-slate-100 dark:bg-slate-800">Last Updated</TableHead>
                <TableHead className="font-semibold whitespace-nowrap bg-slate-100 dark:bg-slate-800">Branch</TableHead>
                <TableHead className="font-semibold whitespace-nowrap bg-slate-100 dark:bg-slate-800">Date Delivered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task, index) => {
                const isDone = task.status === 'done' || task.status === 'pending_approval';
                const isDelayed = task.guestDueDate && 
                  !isDone && 
                  new Date(task.guestDueDate) < new Date();
                const isTranslation = isTranslationPhase(task.fase);

                return (
                  <TableRow 
                    key={task.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 transition-colors",
                      isDelayed && "bg-destructive/5",
                      isDone && "opacity-60"
                    )}
                  >
                    {/* Phase - Sticky z-30 (below header z-50) */}
                    <TableCell 
                      onClick={() => onTaskClick(task)}
                      className="sticky left-0 z-30 bg-white dark:bg-slate-950 w-[100px] min-w-[100px]"
                    >
                      <Badge 
                        className={cn(
                          "whitespace-nowrap text-xs rounded-md px-3 py-1",
                          PHASE_COLORS[task.fase] || PHASE_COLORS[task.currentPhase || ''] || 'bg-gray-200 text-gray-800'
                        )}
                      >
                        {PHASE_LABELS[task.fase] || task.currentPhase || task.fase}
                      </Badge>
                    </TableCell>

                    {/* WO# - Sticky */}
                    <TableCell 
                      onClick={() => onTaskClick(task)}
                      className="sticky z-30 bg-white dark:bg-slate-950 w-[100px] min-w-[100px]"
                      style={{ left: '100px' }}
                    >
                      <span className="text-sm font-mono whitespace-nowrap">
                        {task.workOrderNumber || '—'}
                      </span>
                    </TableCell>

                    {/* File to Translate - Sticky */}
                    <TableCell
                      className="sticky z-30 bg-white dark:bg-slate-950 w-[120px] min-w-[120px]"
                      style={{ left: '200px' }}
                    >
                      <GuestFileCell 
                        taskId={task.id} 
                        category="script" 
                        label="Original script"
                        phase={task.fase}
                      />
                    </TableCell>

                    {/* Original Title - Sticky with shadow separator */}
                    <TableCell 
                      onClick={() => onTaskClick(task)}
                      className="sticky z-30 bg-white dark:bg-slate-950 w-[280px] min-w-[280px] border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]"
                      style={{ left: '320px' }}
                    >
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        {/* Click indicator bubble */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors shrink-0 cursor-pointer">
                              <MessageSquare className="w-3.5 h-3.5 text-primary" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Click to open task details</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="font-medium truncate max-w-[200px]">
                          {task.name || 'Untitled'}
                        </span>
                        {(task.commentCount || 0) > 0 && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {task.commentCount}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* File to Adapt - hidden for Translation phase */}
                    {hasNonTranslationTasks && (
                      <TableCell>
                        {isTranslation ? (
                          <span className="text-muted-foreground text-sm">—</span>
                        ) : (
                          <GuestFileCell 
                            taskId={task.id} 
                            category="translated" 
                            label="Translated file"
                            phase={task.fase}
                          />
                        )}
                      </TableCell>
                    )}

                    {/* Spanish Title */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      <span className="whitespace-nowrap text-muted-foreground">
                        {task.tituloAprobadoEspanol || '—'}
                      </span>
                    </TableCell>

                    {/* Runtime */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      <span className="text-sm font-mono">
                        {task.lockedRuntime || task.finalRuntime || '—'}
                      </span>
                    </TableCell>

                    {/* Episodes */}
                    <TableCell onClick={() => onTaskClick(task)} className="text-center">
                      <span className="text-sm">
                        {task.cantidadEpisodios 
                          ? `${episodeIndexMap?.get(task.id) ?? (index + 1)}/${task.cantidadEpisodios}` 
                          : '—'}
                      </span>
                    </TableCell>

                    {/* Date Assigned (auto) */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      {task.dateAssigned ? (
                        <span className="text-sm whitespace-nowrap">
                          {format(parseLocalDate(task.dateAssigned), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Due Date */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      {task.guestDueDate ? (
                        <span className={cn(
                          "text-sm whitespace-nowrap",
                          isDelayed && "text-destructive font-medium"
                        )}>
                          {format(parseLocalDate(task.guestDueDate), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <GuestStatusBadge
                        status={task.status}
                        guestDueDate={task.guestDueDate}
                        onChange={(status) => onStatusChange(task.id, status)}
                        disabled={isDone}
                      />
                    </TableCell>

                    {/* Last Updated */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      {task.lastUpdated ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(task.lastUpdated), { addSuffix: true })}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{format(new Date(task.lastUpdated), 'PPpp')}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>


                    {/* Branch */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      <span className="text-sm capitalize whitespace-nowrap">
                        {task.branch || '—'}
                      </span>
                    </TableCell>

                    {/* Date Delivered (only shows when task is done with completedAt) */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      {isDone && task.completedAt ? (
                        <span className="text-sm text-green-600 whitespace-nowrap">
                          {format(new Date(task.completedAt), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
