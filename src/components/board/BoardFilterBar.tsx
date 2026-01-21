import { useState, useMemo } from 'react';
import { Search, Filter, X, ChevronDown, User, Calendar, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Task, User as UserType, STATUS_CONFIG } from '@/types/board';

interface BoardFilterBarProps {
  allTasks: Task[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilters: string[];
  onStatusFiltersChange: (statuses: string[]) => void;
  personFilters: string[];
  onPersonFiltersChange: (personIds: string[]) => void;
  clientFilters: string[];
  onClientFiltersChange: (clients: string[]) => void;
}

export function BoardFilterBar({
  allTasks,
  searchQuery,
  onSearchChange,
  statusFilters,
  onStatusFiltersChange,
  personFilters,
  onPersonFiltersChange,
  clientFilters,
  onClientFiltersChange,
}: BoardFilterBarProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [personOpen, setPersonOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);

  // Get unique people from tasks
  const uniquePeople = useMemo(() => {
    const peopleMap = new Map<string, { id: string; name: string; count: number }>();
    
    allTasks.forEach(task => {
      // Project Manager
      if (task.projectManager) {
        const existing = peopleMap.get(task.projectManager.id);
        peopleMap.set(task.projectManager.id, {
          id: task.projectManager.id,
          name: task.projectManager.name,
          count: (existing?.count || 0) + 1
        });
      }
      // Director
      if (task.director) {
        const existing = peopleMap.get(task.director.id);
        peopleMap.set(task.director.id, {
          id: task.director.id,
          name: task.director.name,
          count: (existing?.count || 0) + 1
        });
      }
      // People array
      task.people?.forEach(p => {
        const existing = peopleMap.get(p.id);
        peopleMap.set(p.id, {
          id: p.id,
          name: p.name,
          count: (existing?.count || 0) + 1
        });
      });
    });

    return Array.from(peopleMap.values()).sort((a, b) => b.count - a.count);
  }, [allTasks]);

  // Get unique clients
  const uniqueClients = useMemo(() => {
    const clientMap = new Map<string, number>();
    
    allTasks.forEach(task => {
      if (task.clientName) {
        clientMap.set(task.clientName, (clientMap.get(task.clientName) || 0) + 1);
      }
    });

    return Array.from(clientMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allTasks]);

  // Get status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allTasks.forEach(task => {
      counts[task.status] = (counts[task.status] || 0) + 1;
    });
    return counts;
  }, [allTasks]);

  const activeFilterCount = 
    (searchQuery ? 1 : 0) + 
    statusFilters.length + 
    personFilters.length + 
    clientFilters.length;

  const clearAllFilters = () => {
    onSearchChange('');
    onStatusFiltersChange([]);
    onPersonFiltersChange([]);
    onClientFiltersChange([]);
  };

  const toggleStatus = (status: string) => {
    if (statusFilters.includes(status)) {
      onStatusFiltersChange(statusFilters.filter(s => s !== status));
    } else {
      onStatusFiltersChange([...statusFilters, status]);
    }
  };

  const togglePerson = (personId: string) => {
    if (personFilters.includes(personId)) {
      onPersonFiltersChange(personFilters.filter(p => p !== personId));
    } else {
      onPersonFiltersChange([...personFilters, personId]);
    }
  };

  const toggleClient = (client: string) => {
    if (clientFilters.includes(client)) {
      onClientFiltersChange(clientFilters.filter(c => c !== client));
    } else {
      onClientFiltersChange([...clientFilters, client]);
    }
  };

  return (
    <div className="flex items-center gap-3 mb-4">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, WO#, title..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Status Filter */}
      <Popover open={statusOpen} onOpenChange={setStatusOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn("gap-2", statusFilters.length > 0 && "border-primary text-primary")}
          >
            <Filter className="w-4 h-4" />
            Status
            {statusFilters.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {statusFilters.length}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2 bg-popover border border-border shadow-lg z-[100]">
          <div className="space-y-1">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left",
                  statusFilters.includes(status) && "bg-primary/10"
                )}
              >
                <Checkbox checked={statusFilters.includes(status)} className="pointer-events-none h-3.5 w-3.5" />
                <span className={cn("px-2 py-0.5 rounded text-xs", config.className)}>
                  {config.label}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {statusCounts[status] || 0}
                </span>
              </button>
            ))}
          </div>
          {statusFilters.length > 0 && (
            <>
              <Separator className="my-2" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => onStatusFiltersChange([])}
              >
                Clear status filters
              </Button>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Person Filter */}
      <Popover open={personOpen} onOpenChange={setPersonOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn("gap-2", personFilters.length > 0 && "border-primary text-primary")}
          >
            <User className="w-4 h-4" />
            Person
            {personFilters.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {personFilters.length}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0 bg-popover border border-border shadow-lg z-[100]">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search people..." className="h-8 pl-7 text-sm" />
            </div>
          </div>
          <ScrollArea className="max-h-64">
            <div className="p-1">
              {uniquePeople.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No people found
                </div>
              ) : (
                uniquePeople.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => togglePerson(person.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left",
                      personFilters.includes(person.id) && "bg-primary/10"
                    )}
                  >
                    <Checkbox checked={personFilters.includes(person.id)} className="pointer-events-none h-3.5 w-3.5" />
                    <span className="flex-1 truncate">{person.name}</span>
                    <Badge variant="secondary" className="h-5 text-xs">
                      {person.count}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
          {personFilters.length > 0 && (
            <div className="p-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => onPersonFiltersChange([])}
              >
                Clear person filters
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Client Filter */}
      <Popover open={clientOpen} onOpenChange={setClientOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn("gap-2", clientFilters.length > 0 && "border-primary text-primary")}
          >
            Client
            {clientFilters.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {clientFilters.length}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-0 bg-popover border border-border shadow-lg z-[100]">
          <ScrollArea className="max-h-64">
            <div className="p-1">
              {uniqueClients.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No clients found
                </div>
              ) : (
                uniqueClients.map((client) => (
                  <button
                    key={client.name}
                    onClick={() => toggleClient(client.name)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left",
                      clientFilters.includes(client.name) && "bg-primary/10"
                    )}
                  >
                    <Checkbox checked={clientFilters.includes(client.name)} className="pointer-events-none h-3.5 w-3.5" />
                    <span className="flex-1 truncate">{client.name}</span>
                    <Badge variant="secondary" className="h-5 text-xs">
                      {client.count}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
          {clientFilters.length > 0 && (
            <div className="p-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => onClientFiltersChange([])}
              >
                Clear client filters
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Clear All */}
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-2 text-muted-foreground">
          <X className="w-4 h-4" />
          Clear all ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
