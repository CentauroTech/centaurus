import { useState } from 'react';
import { FileText, Download, Upload, Calendar, Clock, Users, CheckCircle, ExternalLink } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export function GuestTaskTable({ tasks, onTaskClick, onStatusChange }: GuestTaskTableProps) {
  return (
    <TooltipProvider>
      <div className="border rounded-lg bg-card overflow-hidden">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[100px] font-semibold">Phase</TableHead>
                <TableHead className="w-[120px] font-semibold">File to Translate</TableHead>
                <TableHead className="w-[120px] font-semibold">File to Adapt</TableHead>
                <TableHead className="w-[180px] font-semibold">Original Title</TableHead>
                <TableHead className="w-[180px] font-semibold">Spanish Title</TableHead>
                <TableHead className="w-[80px] font-semibold">Runtime</TableHead>
                <TableHead className="w-[60px] font-semibold text-center">Episodes</TableHead>
                <TableHead className="w-[100px] font-semibold">Assigned</TableHead>
                <TableHead className="w-[80px] font-semibold">People</TableHead>
                <TableHead className="w-[140px] font-semibold">Delivery</TableHead>
                <TableHead className="w-[120px] font-semibold">Status</TableHead>
                <TableHead className="w-[100px] font-semibold">Translator</TableHead>
                <TableHead className="w-[100px] font-semibold">Adapter</TableHead>
                <TableHead className="w-[100px] font-semibold">Completed</TableHead>
                <TableHead className="w-[100px] font-semibold">Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const isDone = task.status === 'done';
                const isDelayed = task.guestDueDate && 
                  !isDone && 
                  new Date(task.guestDueDate) < new Date();

                return (
                  <TableRow 
                    key={task.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 transition-colors",
                      isDelayed && "bg-red-500/5",
                      isDone && "opacity-60"
                    )}
                  >
                    {/* Phase */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      <Badge variant="outline" className="whitespace-nowrap text-xs">
                        {PHASE_LABELS[task.fase] || task.currentPhase || task.fase}
                      </Badge>
                    </TableCell>

                    {/* File to Translate */}
                    <TableCell>
                      <GuestFileCell 
                        taskId={task.id} 
                        category="source" 
                        label="Source file"
                        phase={task.fase}
                      />
                    </TableCell>

                    {/* File to Adapt */}
                    <TableCell>
                      <GuestFileCell 
                        taskId={task.id} 
                        category="translated" 
                        label="Translated file"
                        phase={task.fase}
                      />
                    </TableCell>

                    {/* Original Title */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate block max-w-[180px] font-medium">
                            {task.name || 'Untitled'}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{task.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    {/* Spanish Title */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate block max-w-[180px] text-muted-foreground">
                            {task.tituloAprobadoEspanol || '—'}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{task.tituloAprobadoEspanol || 'Not set'}</p>
                        </TooltipContent>
                      </Tooltip>
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

                    {/* Date Assigned */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      {task.dateAssigned ? (
                        <span className="text-sm">
                          {format(new Date(task.dateAssigned), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* People */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      <div className="flex -space-x-2">
                        {task.people && task.people.length > 0 ? (
                          task.people.slice(0, 3).map((person) => (
                            <Tooltip key={person.id}>
                              <TooltipTrigger asChild>
                                <Avatar className="h-7 w-7 border-2 border-background">
                                  <AvatarFallback 
                                    style={{ backgroundColor: person.color }}
                                    className="text-[10px] text-white"
                                  >
                                    {person.initials}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{person.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                        {task.people && task.people.length > 3 && (
                          <Avatar className="h-7 w-7 border-2 border-background">
                            <AvatarFallback className="text-[10px] bg-muted">
                              +{task.people.length - 3}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </TableCell>

                    {/* Delivery - File Upload */}
                    <TableCell>
                      <GuestDeliveryCell 
                        taskId={task.id}
                        disabled={isDone}
                      />
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

                    {/* Translator */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      {task.translator ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback 
                                  style={{ backgroundColor: task.translator.color }}
                                  className="text-[10px] text-white"
                                >
                                  {task.translator.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate max-w-[60px]">
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
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback 
                                  style={{ backgroundColor: task.adapter.color }}
                                  className="text-[10px] text-white"
                                >
                                  {task.adapter.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate max-w-[60px]">
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

                    {/* Date Completed */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      {task.completedAt ? (
                        <span className="text-sm text-green-600">
                          {format(new Date(task.completedAt), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Last Updated */}
                    <TableCell onClick={() => onTaskClick(task)}>
                      {task.lastUpdated ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm text-muted-foreground">
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
