import { useState, useMemo } from 'react';
import { Filter, X, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ColumnConfig, Task } from '@/types/board';
import { ColumnFilter, getUniqueValuesForColumn } from '@/hooks/useColumnFilters';

interface ColumnFilterPopoverProps {
  column: ColumnConfig;
  tasks: Task[];
  activeFilter?: ColumnFilter;
  onSetFilter: (value: string | string[] | null, type: ColumnFilter['type']) => void;
  onClearFilter: () => void;
}

export function ColumnFilterPopover({
  column,
  tasks,
  activeFilter,
  onSetFilter,
  onClearFilter
}: ColumnFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const uniqueValues = useMemo(() => {
    return getUniqueValuesForColumn(tasks, column);
  }, [tasks, column]);

  const filteredValues = useMemo(() => {
    if (!searchQuery) return uniqueValues;
    return uniqueValues.filter(v => 
      v.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [uniqueValues, searchQuery]);

  const isMultiSelect = column.type === 'multi-select' || column.type === 'people';
  
  // For multi-select filters, track selected values as array
  const selectedValues = useMemo(() => {
    if (!activeFilter) return [];
    if (Array.isArray(activeFilter.value)) return activeFilter.value;
    if (activeFilter.value === null) return [];
    return [String(activeFilter.value)];
  }, [activeFilter]);

  const handleValueToggle = (value: string) => {
    if (isMultiSelect || column.type === 'status' || column.type === 'dropdown' || column.type === 'combobox') {
      // Multi-value selection
      const newValues = selectedValues.includes(value)
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value];
      
      if (newValues.length === 0) {
        onClearFilter();
      } else if (newValues.length === 1) {
        onSetFilter(newValues[0], value === '__empty__' ? 'empty' : 'equals');
      } else {
        onSetFilter(newValues, 'includes');
      }
    } else {
      // Single value selection
      if (selectedValues.includes(value)) {
        onClearFilter();
      } else {
        onSetFilter(value, value === '__empty__' ? 'empty' : 'equals');
      }
    }
  };

  const hasFilter = !!activeFilter;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "p-0.5 rounded hover:bg-slate-200 transition-colors",
            hasFilter ? "text-primary" : "text-muted-foreground opacity-0 group-hover/header:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Filter className={cn("w-3 h-3", hasFilter && "fill-primary")} />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        align="start" 
        className="w-64 p-0 bg-popover border border-border shadow-lg z-[100]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Filter: {column.label}</span>
            {hasFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  onClearFilter();
                  setIsOpen(false);
                }}
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="max-h-64">
          <div className="p-1">
            {filteredValues.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No values found
              </div>
            ) : (
              filteredValues.map((item) => {
                const isSelected = selectedValues.includes(item.value);
                return (
                  <button
                    key={item.value}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left",
                      isSelected && "bg-primary/10"
                    )}
                    onClick={() => handleValueToggle(item.value)}
                  >
                    <Checkbox 
                      checked={isSelected} 
                      className="pointer-events-none h-3.5 w-3.5"
                    />
                    <span className={cn(
                      "flex-1 truncate",
                      item.value === '__empty__' && "italic text-muted-foreground"
                    )}>
                      {item.label}
                    </span>
                    <Badge variant="secondary" className="h-5 text-xs">
                      {item.count}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        {selectedValues.length > 0 && (
          <div className="p-2 border-t border-border bg-muted/30">
            <div className="flex flex-wrap gap-1">
              {selectedValues.slice(0, 3).map(val => {
                const item = uniqueValues.find(v => v.value === val);
                return (
                  <Badge key={val} variant="secondary" className="text-xs gap-1">
                    {item?.label || val}
                    <X 
                      className="w-2.5 h-2.5 cursor-pointer hover:text-destructive" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleValueToggle(val);
                      }}
                    />
                  </Badge>
                );
              })}
              {selectedValues.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{selectedValues.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
