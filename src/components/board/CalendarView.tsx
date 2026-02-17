import { useState, useMemo, useCallback, DragEvent } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isValid,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Search, X, User, ChevronDown, Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Task, User as UserType, PHASE_DUE_DATE_MAP, ALL_PHASE_DUE_DATE_FIELDS } from '@/types/board';
import { toast } from 'sonner';

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

function toDate(d: Date | string | undefined): Date | null {
  if (!d) return null;
  const parsed = typeof d === 'string' ? parseLocalDate(d) : d;
  return isValid(parsed) ? parsed : null;
}

function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Static Tailwind classes for phase colors (so they aren't purged)
const PHASE_EVENT_STYLES: Record<string, string> = {
  assets: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500',
  translation: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500',
  adapting: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500',
  voice_tests: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500',
  recording: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500',
  premix: 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500',
  qc_premix: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500',
  retakes: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500',
  qc_retakes: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500',
  mix: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500',
  qc_mix: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500',
  mix_retakes: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500',
};

const LEGEND_DOT_STYLES: Record<string, string> = {
  miami: 'bg-orange-500',
  client: 'bg-blue-500',
  assets: 'bg-cyan-500',
  translation: 'bg-indigo-500',
  adapting: 'bg-teal-500',
  voice_tests: 'bg-yellow-500',
  recording: 'bg-red-500',
  premix: 'bg-pink-500',
  qc_premix: 'bg-purple-500',
  retakes: 'bg-violet-500',
  qc_retakes: 'bg-amber-500',
  mix: 'bg-sky-500',
  qc_mix: 'bg-fuchsia-500',
  mix_retakes: 'bg-rose-500',
};

interface CalendarEvent {
  task: Task;
  date: Date;
  type: string;
  label: string;
  field: keyof Task;
}

type CalendarViewMode = 'daily' | 'weekly' | 'monthly';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  boardName: string;
  isHQ: boolean;
}

// Map date source key to Task field for updates
const DATE_SOURCE_FIELD_MAP: Record<string, keyof Task> = {
  miami: 'entregaMiamiEnd',
  client: 'entregaCliente',
  assets: 'assetsDueDate',
  translation: 'translationDueDate',
  adapting: 'adaptingDueDate',
  voice_tests: 'voiceTestsDueDate',
  recording: 'recordingDueDate',
  premix: 'premixDueDate',
  qc_premix: 'qcPremixDueDate',
  retakes: 'retakesDueDate',
  qc_retakes: 'qcRetakesDueDate',
  mix: 'mixDueDate',
  qc_mix: 'qcMixDueDate',
  mix_retakes: 'mixRetakesDueDate',
};

function getDateSources(boardName: string, isHQ: boolean) {
  const sources: { key: string; label: string; field: keyof Task; defaultOn: boolean }[] = [
    { key: 'miami', label: 'Miami Due Date', field: 'entregaMiamiEnd', defaultOn: true },
    { key: 'client', label: 'Client Due Date', field: 'entregaCliente', defaultOn: true },
  ];

  if (isHQ) {
    ALL_PHASE_DUE_DATE_FIELDS.forEach(p => {
      sources.push({ key: p.key, label: p.label, field: p.field, defaultOn: false });
    });
  } else {
    const boardLower = boardName.toLowerCase();
    for (const [phaseKey, config] of Object.entries(PHASE_DUE_DATE_MAP)) {
      if (boardLower.includes(phaseKey)) {
        const phaseInfo = ALL_PHASE_DUE_DATE_FIELDS.find(p => p.field === config.field);
        if (phaseInfo) {
          sources.push({ key: phaseInfo.key, label: config.label, field: config.field, defaultOn: true });
        }
        break;
      }
    }
  }

  return sources;
}

export function CalendarView({ tasks, onTaskClick, onUpdateTask, boardName, isHQ }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [pmFilters, setPmFilters] = useState<string[]>([]);
  const [clientFilters, setClientFilters] = useState<string[]>([]);
  const [pmOpen, setPmOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [dateSourcesOpen, setDateSourcesOpen] = useState(false);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Add date popover state
  const [addDateCell, setAddDateCell] = useState<Date | null>(null);
  const [addDateTaskSearch, setAddDateTaskSearch] = useState('');
  const [addDateType, setAddDateType] = useState<string>('');
  const [addDateSelectedTasks, setAddDateSelectedTasks] = useState<Set<string>>(new Set());

  const dateSources = useMemo(() => getDateSources(boardName, isHQ), [boardName, isHQ]);

  const [enabledSources, setEnabledSources] = useState<Set<string>>(() => {
    return new Set(dateSources.filter(s => s.defaultOn).map(s => s.key));
  });

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const hasAnyDate = dateSources.some(s => enabledSources.has(s.key) && !!toDate(task[s.field] as any));
      if (!hasAnyDate) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const fields = [task.name, task.workOrderNumber, task.tituloAprobadoEspanol].filter(Boolean);
        if (!fields.some(f => String(f).toLowerCase().includes(q))) return false;
      }

      if (pmFilters.length > 0) {
        if (!task.projectManager || !pmFilters.includes(task.projectManager.id)) return false;
      }

      if (clientFilters.length > 0) {
        if (!task.clientName || !clientFilters.includes(task.clientName)) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, pmFilters, clientFilters, enabledSources, dateSources]);

  // Also get tasks without dates for the "add date" feature
  const tasksWithoutDates = useMemo(() => {
    return tasks.filter(task => {
      if (addDateTaskSearch) {
        const q = addDateTaskSearch.toLowerCase();
        return task.name.toLowerCase().includes(q) || task.workOrderNumber?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tasks, addDateTaskSearch]);

  // Build calendar events
  const events = useMemo(() => {
    const result: CalendarEvent[] = [];
    filteredTasks.forEach(task => {
      dateSources.forEach(source => {
        if (!enabledSources.has(source.key)) return;
        const d = toDate(task[source.field] as any);
        if (d) result.push({ task, date: d, type: source.key, label: source.label, field: source.field });
      });
    });
    return result;
  }, [filteredTasks, dateSources, enabledSources]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(ev => {
      const key = format(ev.date, 'yyyy-MM-dd');
      const arr = map.get(key) || [];
      arr.push(ev);
      map.set(key, arr);
    });
    return map;
  }, [events]);

  // Unique PMs
  const uniquePMs = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    tasks.forEach(task => {
      if (task.projectManager) {
        const pm = task.projectManager;
        const existing = map.get(pm.id);
        map.set(pm.id, { id: pm.id, name: pm.name, count: (existing?.count || 0) + 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [tasks]);

  // Unique clients
  const uniqueClients = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach(task => {
      if (task.clientName) map.set(task.clientName, (map.get(task.clientName) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [tasks]);

  // Navigation
  const goBack = () => {
    if (viewMode === 'monthly') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'weekly') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, -1));
  };
  const goForward = () => {
    if (viewMode === 'monthly') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'weekly') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  const headerLabel = useMemo(() => {
    if (viewMode === 'monthly') return format(currentDate, 'MMMM yyyy');
    if (viewMode === 'weekly') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'EEEE, MMMM d, yyyy');
  }, [currentDate, viewMode]);

  // Compute days to display
  const displayDays = useMemo(() => {
    if (viewMode === 'daily') return [startOfDay(currentDate)];
    if (viewMode === 'weekly') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    }
    // Monthly
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate, viewMode]);

  const weeks = useMemo(() => {
    if (viewMode !== 'monthly') return [];
    const result: Date[][] = [];
    for (let i = 0; i < displayDays.length; i += 7) {
      result.push(displayDays.slice(i, i + 7));
    }
    return result;
  }, [displayDays, viewMode]);

  const toggleSource = (key: string) => {
    setEnabledSources(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const activeFilterCount = (searchQuery ? 1 : 0) + pmFilters.length + clientFilters.length;

  const getEventClasses = (type: string) => {
    if (type === 'miami') return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-l-2 border-orange-500';
    if (type === 'client') return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-l-2 border-blue-500';
    const style = PHASE_EVENT_STYLES[type];
    return style ? `${style} border-l-2` : 'bg-gray-500/15 text-gray-700 dark:text-gray-300 border-l-2 border-gray-500';
  };

  // Drag & Drop handlers
  const handleDragStart = useCallback((e: DragEvent<HTMLButtonElement>, ev: CalendarEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      taskId: ev.task.id,
      type: ev.type,
      field: ev.field,
    }));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDate(null);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>, targetDate: Date) => {
    e.preventDefault();
    setDragOverDate(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { taskId, type } = data;
      const field = DATE_SOURCE_FIELD_MAP[type];
      if (!field || !onUpdateTask) return;
      const dateStr = formatDateForDB(targetDate);
      onUpdateTask(taskId, { [field]: dateStr } as Partial<Task>);
      toast.success(`Date updated to ${format(targetDate, 'MMM d, yyyy')}`);
    } catch {
      // ignore
    }
  }, [onUpdateTask]);

  // Add date handler - supports multiple tasks at once
  const handleAddDate = useCallback((targetDate: Date) => {
    if (!onUpdateTask || addDateSelectedTasks.size === 0 || !addDateType) return;
    const field = DATE_SOURCE_FIELD_MAP[addDateType];
    if (!field) return;
    const dateStr = formatDateForDB(targetDate);
    const taskIds = Array.from(addDateSelectedTasks);
    taskIds.forEach(taskId => {
      onUpdateTask(taskId, { [field]: dateStr } as Partial<Task>);
    });
    const label = dateSources.find(s => s.key === addDateType)?.label || 'Date';
    toast.success(`${label} set for ${taskIds.length} task${taskIds.length > 1 ? 's' : ''}`);
    setAddDateCell(null);
    setAddDateTaskSearch('');
    setAddDateType('');
    setAddDateSelectedTasks(new Set());
  }, [onUpdateTask, dateSources, addDateSelectedTasks, addDateType]);

  const toggleAddDateTask = useCallback((taskId: string) => {
    setAddDateSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  // All date type options (not filtered by enabled sources)
  const allDateTypeOptions = useMemo(() => {
    const base: { key: string; label: string }[] = [
      { key: 'miami', label: 'Miami Due Date' },
      { key: 'client', label: 'Client Due Date' },
    ];
    ALL_PHASE_DUE_DATE_FIELDS.forEach(p => {
      base.push({ key: p.key, label: p.label });
    });
    return base;
  }, []);

  // Render a single day cell
  const renderDayCell = (day: Date, isCompact: boolean) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayEvents = eventsByDate.get(dateKey) || [];
    const inMonth = viewMode === 'monthly' ? isSameMonth(day, currentDate) : true;
    const today = isToday(day);
    const isDragOver = dragOverDate === dateKey;
    const maxEvents = isCompact ? 4 : 20;

    return (
      <div
        key={dateKey}
        className={cn(
          "border-b border-r border-border p-1 transition-colors relative group",
          isCompact ? "min-h-[100px]" : "min-h-[200px]",
          !inMonth && "bg-muted/30",
          today && "bg-primary/5",
          isDragOver && "bg-primary/15 ring-2 ring-primary/40 ring-inset"
        )}
        onDragOver={(e) => handleDragOver(e, dateKey)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, day)}
      >
        <div className="flex items-center justify-between px-1 mb-1">
          <div className={cn(
            "text-xs font-medium",
            !inMonth && "text-muted-foreground/50",
            today && "text-primary font-bold"
          )}>
            {viewMode === 'daily' ? format(day, 'EEEE, MMMM d') : format(day, 'd')}
          </div>
          {/* Add date button */}
          {onUpdateTask && (
            <Popover 
              open={addDateCell !== null && isSameDay(addDateCell, day)} 
              onOpenChange={(open) => {
                if (open) {
                  setAddDateCell(day);
                  setAddDateTaskSearch('');
                  setAddDateType(dateSources[0]?.key || 'miami');
                  setAddDateSelectedTasks(new Set());
                } else {
                  setAddDateCell(null);
                  setAddDateSelectedTasks(new Set());
                }
              }}
            >
              <PopoverTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted">
                  <Plus className="w-3 h-3 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 p-3 z-[100]" side="right">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Add due date – {format(day, 'MMM d')}</h4>
                  <Select value={addDateType} onValueChange={setAddDateType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Date type" />
                    </SelectTrigger>
                    <SelectContent>
                      {allDateTypeOptions.map(s => (
                        <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Search tasks..."
                    value={addDateTaskSearch}
                    onChange={(e) => setAddDateTaskSearch(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <ScrollArea className="max-h-48">
                    <div className="space-y-0.5">
                      {tasksWithoutDates.slice(0, 30).map(task => (
                        <button
                          key={task.id}
                          onClick={() => toggleAddDateTask(task.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors text-left",
                            addDateSelectedTasks.has(task.id) && "bg-primary/10"
                          )}
                        >
                          <Checkbox checked={addDateSelectedTasks.has(task.id)} className="pointer-events-none h-3.5 w-3.5" />
                          <span className="flex-1 truncate font-medium">{task.name}</span>
                          {task.workOrderNumber && (
                            <span className="text-muted-foreground flex-shrink-0">({task.workOrderNumber})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                  {addDateSelectedTasks.size > 0 && (
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => handleAddDate(day)}
                    >
                      Set date for {addDateSelectedTasks.size} task{addDateSelectedTasks.size > 1 ? 's' : ''}
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="space-y-0.5 overflow-hidden">
          {dayEvents.slice(0, maxEvents).map((ev, i) => (
            <button
              key={`${ev.task.id}-${ev.type}-${i}`}
              draggable
              onDragStart={(e) => handleDragStart(e, ev)}
              onClick={() => onTaskClick?.(ev.task.id)}
              className={cn(
                "w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate block transition-colors hover:opacity-80 cursor-grab active:cursor-grabbing",
                getEventClasses(ev.type),
                !isCompact && "text-xs py-1"
              )}
              title={`${ev.task.name} (${ev.label}) – Drag to reschedule`}
            >
              {!isCompact && <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0", LEGEND_DOT_STYLES[ev.type] || 'bg-gray-500')} />}
              {ev.task.name}
            </button>
          ))}
          {dayEvents.length > maxEvents && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-[10px] text-muted-foreground px-1 hover:text-foreground hover:underline cursor-pointer transition-colors">
                  +{dayEvents.length - maxEvents} more
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-2 z-[100]" side="right">
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  <h4 className="text-xs font-medium text-muted-foreground mb-1.5">{format(day, 'MMM d')} – {dayEvents.length} events</h4>
                  {dayEvents.map((ev, i) => (
                    <button
                      key={`${ev.task.id}-${ev.type}-${i}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, ev)}
                      onClick={(e) => { e.stopPropagation(); onTaskClick?.(ev.task.id); }}
                      className={cn(
                        "w-full text-left text-xs leading-tight px-2 py-1.5 rounded truncate block transition-colors hover:opacity-80 cursor-grab active:cursor-grabbing",
                        getEventClasses(ev.type)
                      )}
                      title={`${ev.task.name} (${ev.label}) – Drag to reschedule`}
                    >
                      <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0", LEGEND_DOT_STYLES[ev.type] || 'bg-gray-500')} />
                      {ev.task.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-md min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by project name, WO#..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* PM Filter */}
        <Popover open={pmOpen} onOpenChange={setPmOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-2", pmFilters.length > 0 && "border-primary text-primary")}>
              <User className="w-4 h-4" />
              PM
              {pmFilters.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{pmFilters.length}</Badge>}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0 bg-popover border border-border shadow-lg z-[100]">
            <ScrollArea className="max-h-64">
              <div className="p-1">
                {uniquePMs.map(pm => (
                  <button
                    key={pm.id}
                    onClick={() => setPmFilters(prev => prev.includes(pm.id) ? prev.filter(p => p !== pm.id) : [...prev, pm.id])}
                    className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left", pmFilters.includes(pm.id) && "bg-primary/10")}
                  >
                    <Checkbox checked={pmFilters.includes(pm.id)} className="pointer-events-none h-3.5 w-3.5" />
                    <span className="flex-1 truncate">{pm.name}</span>
                    <Badge variant="secondary" className="h-5 text-xs">{pm.count}</Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
            {pmFilters.length > 0 && (
              <div className="p-2 border-t border-border">
                <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => setPmFilters([])}>Clear</Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Client Filter */}
        <Popover open={clientOpen} onOpenChange={setClientOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-2", clientFilters.length > 0 && "border-primary text-primary")}>
              Client
              {clientFilters.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{clientFilters.length}</Badge>}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-0 bg-popover border border-border shadow-lg z-[100]">
            <ScrollArea className="max-h-64">
              <div className="p-1">
                {uniqueClients.map(client => (
                  <button
                    key={client.name}
                    onClick={() => setClientFilters(prev => prev.includes(client.name) ? prev.filter(c => c !== client.name) : [...prev, client.name])}
                    className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left", clientFilters.includes(client.name) && "bg-primary/10")}
                  >
                    <Checkbox checked={clientFilters.includes(client.name)} className="pointer-events-none h-3.5 w-3.5" />
                    <span className="flex-1 truncate">{client.name}</span>
                    <Badge variant="secondary" className="h-5 text-xs">{client.count}</Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
            {clientFilters.length > 0 && (
              <div className="p-2 border-t border-border">
                <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => setClientFilters([])}>Clear</Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Date Sources Toggle */}
        <Popover open={dateSourcesOpen} onOpenChange={setDateSourcesOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Eye className="w-4 h-4" />
              Dates
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">{enabledSources.size}</Badge>
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0 bg-popover border border-border shadow-lg z-[100]">
            <ScrollArea className="max-h-[480px]">
              <div className="p-1">
                {dateSources.length > 2 && (
                  <button
                    onClick={() => {
                      const allKeys = dateSources.map(s => s.key);
                      const allEnabled = allKeys.every(k => enabledSources.has(k));
                      setEnabledSources(new Set(allEnabled ? [] : allKeys));
                    }}
                    className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left font-medium", dateSources.every(s => enabledSources.has(s.key)) && "bg-primary/10")}
                  >
                    <Checkbox checked={dateSources.every(s => enabledSources.has(s.key))} className="pointer-events-none h-3.5 w-3.5" />
                    <span className="flex-1 truncate">Select All</span>
                  </button>
                )}
                {dateSources.map(source => (
                  <button
                    key={source.key}
                    onClick={() => toggleSource(source.key)}
                    className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left", enabledSources.has(source.key) && "bg-primary/10")}
                  >
                    <Checkbox checked={enabledSources.has(source.key)} className="pointer-events-none h-3.5 w-3.5" />
                    <span className={cn("w-2.5 h-2.5 rounded-sm flex-shrink-0", LEGEND_DOT_STYLES[source.key] || 'bg-gray-500')} />
                    <span className="flex-1 truncate">{source.label}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setPmFilters([]); setClientFilters([]); }} className="gap-2 text-muted-foreground">
            <X className="w-4 h-4" />
            Clear all ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 flex-shrink-0 flex-wrap">
        {dateSources.filter(s => enabledSources.has(s.key)).map(source => (
          <div key={source.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("w-2.5 h-2.5 rounded-sm", LEGEND_DOT_STYLES[source.key] || 'bg-gray-500')} />
            {source.label}
          </div>
        ))}
      </div>

      {/* Navigation & View Mode */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="text-xs">
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={goForward}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">{headerLabel}</h2>
        </div>

        {/* View mode selector */}
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          {(['daily', 'weekly', 'monthly'] as CalendarViewMode[]).map(mode => (
            <Button
              key={mode}
              variant={viewMode === mode ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none h-8 px-3 text-xs capitalize"
              onClick={() => setViewMode(mode)}
            >
              {mode}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'monthly' && (
          <>
            <div className="grid grid-cols-7 border-b border-border">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground border-r border-border last:border-r-0">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {weeks.map((week, wi) =>
                week.map((day, di) => (
                  <div key={format(day, 'yyyy-MM-dd')} className={cn(di === 6 && "border-r-0")}>
                    {renderDayCell(day, true)}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {viewMode === 'weekly' && (
          <>
            <div className="grid grid-cols-7 border-b border-border">
              {displayDays.map(day => (
                <div key={format(day, 'yyyy-MM-dd')} className={cn(
                  "py-2 text-center text-xs font-medium border-r border-border last:border-r-0",
                  isToday(day) ? "text-primary font-bold" : "text-muted-foreground"
                )}>
                  {format(day, 'EEE d')}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {displayDays.map(day => (
                <div key={format(day, 'yyyy-MM-dd')}>
                  {renderDayCell(day, false)}
                </div>
              ))}
            </div>
          </>
        )}

        {viewMode === 'daily' && (
          <div className="max-w-3xl">
            {displayDays.map(day => (
              <div key={format(day, 'yyyy-MM-dd')}>
                {renderDayCell(day, false)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
