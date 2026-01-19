import { MessageSquare, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GuestTask } from '@/hooks/useGuestTasks';
import { GuestStatusBadge } from './GuestStatusBadge';
import { GuestFileCell } from './GuestFileCell';
import { GuestDeliveryCell } from './GuestDeliveryCell';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface GuestTaskTableProps {
  tasks: GuestTask[];
  onTaskClick: (task: GuestTask) => void;
  onStatusChange: (taskId: string, status: 'default' | 'working' | 'done') => void;
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

// Sticky column offsets (cumulative widths)
const STICKY_OFFSETS = {
  phase: 0,        // First column
  wo: 100,         // Phase width ~100px
  fileTranslate: 200, // Phase + WO ~100px
  originalTitle: 320, // Phase + WO + File ~120px
};

export function GuestTaskTable({ tasks, onTaskClick, onStatusChange }: GuestTaskTableProps) {
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
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                {/* Sticky columns - z-30 to stay above body cells */}
                <TableHead 
                  className="font-semibold whitespace-nowrap sticky z-30 bg-muted w-[100px]"
                  style={{ left: STICKY_OFFSETS.phase }}
                >
                  Phase
                </TableHead>
                <TableHead 
                  className="font-semibold whitespace-nowrap sticky z-30 bg-muted w-[100px]"
                  style={{ left: STICKY_OFFSETS.wo }}
                >
                  WO#
                </TableHead>
                <TableHead 
                  className="font-semibold whitespace-nowrap sticky z-30 bg-muted w-[120px]"
                  style={{ left: STICKY_OFFSETS.fileTranslate }}
                >
                  File to Translate
                </TableHead>
                <TableHead 
                  className="font-semibold whitespace-nowrap sticky z-30 bg-muted w-[200px] border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]"
                  style={{ left: STICKY_OFFSETS.originalTitle }}
                >
                  Original Title
                </TableHead>
                
                {/* Scrollable columns */}
                {hasNonTranslationTasks && (
                  <TableHead className="font-semibold whitespace-nowrap bg-muted/30">File to Adapt</TableHead>
                )}
                <TableHead className="font-semibold whitespace-nowrap bg-muted/30">Spanish Title</TableHead>
                <TableHead className="font-semibold whitespace-nowrap bg-muted/30">Runtime</TableHead>
                <TableHead className="font-semibold whitespace-nowrap text-center bg-muted/30">Episodes</TableHead>
                <TableHead className="font-semibold whitespace-nowrap bg-muted/30">Date Assigned</TableHead>
                <TableHead className="font-semibold whitespace-nowrap bg-muted/30">Delivery</TableHead>
                <TableHead className="font-semibold whitespace-nowrap bg-muted/30">Due Date</TableHead>
                <TableHead className="font-semibold whitespace-nowrap bg-muted/30">Status</TableHead>
                <TableHead className="font-semibold whitespace-nowrap bg-muted/30">Last Updated</TableHead>
                <TableHead className="font-semibold whitespace-nowrap bg-muted/30">Translator</TableHead>
                <TableHead className="font-semibold whitespace-nowrap bg-muted/30">Adapter</TableHead>
                <TableHead className="font-semibold whitespace-nowrap bg-muted/30">Date Delivered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const isDone = task.status === 'done';
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
                    {/* Phase - Sticky z-20 (below header z-30) */}
                    <TableCell 
                      onClick={() => onTaskClick(task)}
                      className="sticky z-20 bg-card w-[100px]"
                      style={{ left: STICKY_OFFSETS.phase }}
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
                      className="sticky z-20 bg-card w-[100px]"
                      style={{ left: STICKY_OFFSETS.wo }}
                    >
                      <span className="text-sm font-mono whitespace-nowrap">
                        {task.workOrderNumber || '—'}
                      </span>
                    </TableCell>

                    {/* File to Translate - Sticky */}
                    <TableCell
                      className="sticky z-20 bg-card w-[120px]"
                      style={{ left: STICKY_OFFSETS.fileTranslate }}
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
                      className="sticky z-20 bg-card w-[200px] border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]"
                      style={{ left: STICKY_OFFSETS.originalTitle }}
                    >
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="font-medium truncate max-w-[160px]">
                          {task.name || 'Untitled'}
                        </span>
                        {(task.commentCount || 0) > 0 && (
                          <div className="flex items-center gap-1 text-primary shrink-0">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="text-xs">{task.commentCount}</span>
                          </div>
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
                        {task.cantidadEpisodios || '—'}
                      </span>
                    </TableCell>

                    {/* Date Assigned (auto) */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      {task.dateAssigned ? (
                        <span className="text-sm whitespace-nowrap">
                          {format(new Date(task.dateAssigned), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Delivery - File Upload */}
                    <TableCell>
                      <GuestDeliveryCell 
                        taskId={task.id}
                        disabled={isDone}
                      />
                    </TableCell>

                    {/* Due Date */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      {task.guestDueDate ? (
                        <span className={cn(
                          "text-sm whitespace-nowrap",
                          isDelayed && "text-destructive font-medium"
                        )}>
                          {format(new Date(task.guestDueDate), 'MMM d, yyyy')}
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

                    {/* Translator */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      {task.translator ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarFallback 
                                  style={{ backgroundColor: task.translator.color }}
                                  className="text-[10px] text-white"
                                >
                                  {task.translator.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {task.translator.name.split(' ')[0]}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{task.translator.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Adapter */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      {task.adapter ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarFallback 
                                  style={{ backgroundColor: task.adapter.color }}
                                  className="text-[10px] text-white"
                                >
                                  {task.adapter.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {task.adapter.name.split(' ')[0]}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{task.adapter.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Date Delivered (automatically set when status = done) */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      {task.completedAt ? (
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
