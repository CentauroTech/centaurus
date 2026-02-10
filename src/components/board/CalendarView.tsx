import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  isValid,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Search, X, User, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Task, User as UserType, PHASE_DUE_DATE_MAP, ALL_PHASE_DUE_DATE_FIELDS } from '@/types/board';

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

// Color palette for phase due dates
const PHASE_COLORS: Record<string, string> = {
  assets: 'cyan',
  translation: 'indigo',
  adapting: 'teal',
  voice_tests: 'yellow',
  recording: 'red',
  premix: 'pink',
  qc_premix: 'purple',
  retakes: 'violet',
  qc_retakes: 'amber',
  mix: 'sky',
  qc_mix: 'fuchsia',
  mix_retakes: 'rose',
};

function getEventColor(type: string): { bg: string; text: string; border: string } {
  switch (type) {
    case 'miami':
      return { bg: 'bg-orange-500/15', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-500' };
    case 'client':
      return { bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500' };
    default: {
      const c = PHASE_COLORS[type] || 'gray';
      return {
        bg: `bg-${c}-500/15`,
        text: `text-${c}-700 dark:text-${c}-300`,
        border: `border-${c}-500`,
      };
    }
  }
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
  type: string; // 'miami' | 'client' | phase key
  label: string;
}

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  boardName: string;
  isHQ: boolean;
}

// Determine which date sources to offer based on board context
function getDateSources(boardName: string, isHQ: boolean) {
  const sources: { key: string; label: string; field: keyof Task; defaultOn: boolean }[] = [
    { key: 'miami', label: 'Miami Due Date', field: 'entregaMiamiEnd', defaultOn: true },
    { key: 'client', label: 'Client Due Date', field: 'entregaCliente', defaultOn: true },
  ];

  if (isHQ) {
    // HQ: add all phase due dates as toggleable
    ALL_PHASE_DUE_DATE_FIELDS.forEach(p => {
      sources.push({ key: p.key, label: p.label, field: p.field, defaultOn: false });
    });
  } else {
    // Individual board: find the phase due date for this board
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

export function CalendarView({ tasks, onTaskClick, boardName, isHQ }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [pmFilters, setPmFilters] = useState<string[]>([]);
  const [clientFilters, setClientFilters] = useState<string[]>([]);
  const [pmOpen, setPmOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [dateSourcesOpen, setDateSourcesOpen] = useState(false);

  const dateSources = useMemo(() => getDateSources(boardName, isHQ), [boardName, isHQ]);

  // Initialize enabled sources
  const [enabledSources, setEnabledSources] = useState<Set<string>>(() => {
    return new Set(dateSources.filter(s => s.defaultOn).map(s => s.key));
  });

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Must have at least one enabled date
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

  // Build calendar events
  const events = useMemo(() => {
    const result: CalendarEvent[] = [];
    filteredTasks.forEach(task => {
      dateSources.forEach(source => {
        if (!enabledSources.has(source.key)) return;
        const d = toDate(task[source.field] as any);
        if (d) result.push({ task, date: d, type: source.key, label: source.label });
      });
    });
    return result;
  }, [filteredTasks, dateSources, enabledSources]);

  // Events grouped by date string
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

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

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
            <ScrollArea className="max-h-80">
              <div className="p-1">
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

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 border-b border-border">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground border-r border-border last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 flex-1">
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate.get(dateKey) || [];
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);

              return (
                <div
                  key={dateKey}
                  className={cn(
                    "min-h-[100px] border-b border-r border-border p-1 transition-colors",
                    di === 6 && "border-r-0",
                    !inMonth && "bg-muted/30",
                    today && "bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "text-xs font-medium mb-1 text-right px-1",
                    !inMonth && "text-muted-foreground/50",
                    today && "text-primary font-bold"
                  )}>
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 4).map((ev, i) => (
                      <button
                        key={`${ev.task.id}-${ev.type}-${i}`}
                        onClick={() => onTaskClick?.(ev.task.id)}
                        className={cn(
                          "w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate block transition-colors hover:opacity-80",
                          getEventClasses(ev.type)
                        )}
                        title={`${ev.task.name} (${ev.label})`}
                      >
                        {ev.task.name}
                      </button>
                    ))}
                    {dayEvents.length > 4 && (
                      <span className="text-[10px] text-muted-foreground px-1">
                        +{dayEvents.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
