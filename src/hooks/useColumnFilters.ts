import { useState, useCallback, useMemo } from 'react';
import { Task, ColumnConfig, User } from '@/types/board';

export type FilterValue = string | string[] | boolean | null;

export interface ColumnFilter {
  columnId: string;
  field: keyof Task;
  value: FilterValue;
  type: 'equals' | 'contains' | 'includes' | 'boolean' | 'dateRange' | 'empty' | 'notEmpty';
}

export interface ColumnFiltersState {
  [columnId: string]: ColumnFilter;
}

export function useColumnFiltersHook(boardId: string) {
  const [filters, setFilters] = useState<ColumnFiltersState>({});

  const setFilter = useCallback((columnId: string, field: keyof Task, value: FilterValue, type: ColumnFilter['type'] = 'equals') => {
    setFilters(prev => {
      // If value is null/empty, remove the filter
      if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        const { [columnId]: removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [columnId]: { columnId, field, value, type }
      };
    });
  }, []);

  const clearFilter = useCallback((columnId: string) => {
    setFilters(prev => {
      const { [columnId]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  const activeFilterCount = useMemo(() => Object.keys(filters).length, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  // Filter tasks based on active filters
  const filterTasks = useCallback((tasks: Task[]): Task[] => {
    if (!hasActiveFilters) return tasks;

    return tasks.filter(task => {
      return Object.values(filters).every(filter => {
        const taskValue = task[filter.field];

        switch (filter.type) {
          case 'equals':
            if (taskValue === undefined || taskValue === null) {
              return filter.value === null || filter.value === '';
            }
            // Handle User objects (person fields)
            if (typeof taskValue === 'object' && taskValue !== null && 'id' in taskValue) {
              return (taskValue as User).id === filter.value;
            }
            return String(taskValue) === String(filter.value);

          case 'contains':
            if (taskValue === undefined || taskValue === null) return false;
            return String(taskValue).toLowerCase().includes(String(filter.value).toLowerCase());

          case 'includes':
            // For array fields like servicios, formato, or multi-value selection
            if (Array.isArray(filter.value)) {
              // Multiple values selected - task should match ANY of them
              if (Array.isArray(taskValue)) {
                // Task value is array (multi-select) - check if any filter value is in task array
                return filter.value.some(v => (taskValue as string[]).includes(v));
              }
              // Task value is scalar - check if it matches any filter value
              if (typeof taskValue === 'object' && taskValue !== null && 'id' in taskValue) {
                return filter.value.includes((taskValue as User).id);
              }
              return filter.value.includes(String(taskValue));
            }
            // Single filter value
            if (!Array.isArray(taskValue)) return false;
            return (taskValue as string[]).includes(filter.value as string);

          case 'boolean':
            return taskValue === filter.value;

          case 'empty':
            return taskValue === undefined || taskValue === null || taskValue === '' || 
              (Array.isArray(taskValue) && taskValue.length === 0);

          case 'notEmpty':
            return taskValue !== undefined && taskValue !== null && taskValue !== '' && 
              (!Array.isArray(taskValue) || taskValue.length > 0);

          default:
            return true;
        }
      });
    });
  }, [filters, hasActiveFilters]);

  return {
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,
    filterTasks,
    activeFilterCount,
    hasActiveFilters
  };
}

// Get unique values from tasks for a given column
export function getUniqueValuesForColumn(tasks: Task[], column: ColumnConfig): { value: string; label: string; count: number }[] {
  const valueMap = new Map<string, { label: string; count: number }>();

  tasks.forEach(task => {
    const rawValue = task[column.field];
    
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      const existing = valueMap.get('__empty__');
      valueMap.set('__empty__', { 
        label: '(Empty)', 
        count: (existing?.count || 0) + 1 
      });
      return;
    }

    // Handle different types
    if (column.type === 'person' && typeof rawValue === 'object' && rawValue !== null && 'id' in rawValue) {
      const user = rawValue as User;
      const existing = valueMap.get(user.id);
      valueMap.set(user.id, { 
        label: user.name, 
        count: (existing?.count || 0) + 1 
      });
    } else if (column.type === 'people' && Array.isArray(rawValue)) {
      (rawValue as User[]).forEach((user) => {
        const existing = valueMap.get(user.id);
        valueMap.set(user.id, { 
          label: user.name, 
          count: (existing?.count || 0) + 1 
        });
      });
    } else if (column.type === 'multi-select' && Array.isArray(rawValue)) {
      (rawValue as string[]).forEach((v) => {
        const existing = valueMap.get(v);
        valueMap.set(v, { 
          label: v, 
          count: (existing?.count || 0) + 1 
        });
      });
    } else if (column.type === 'boolean') {
      const boolVal = rawValue ? 'true' : 'false';
      const existing = valueMap.get(boolVal);
      valueMap.set(boolVal, { 
        label: boolVal === 'true' ? 'Yes' : 'No', 
        count: (existing?.count || 0) + 1 
      });
    } else if (column.type === 'status') {
      const existing = valueMap.get(String(rawValue));
      const statusLabels: Record<string, string> = {
        'done': 'Done',
        'launch': 'Launch',
        'working': 'Working on it',
        'delayed': 'Delayed',
        'default': 'Not started'
      };
      valueMap.set(String(rawValue), { 
        label: statusLabels[String(rawValue)] || String(rawValue), 
        count: (existing?.count || 0) + 1 
      });
    } else {
      const strVal = String(rawValue);
      const existing = valueMap.get(strVal);
      valueMap.set(strVal, { 
        label: strVal, 
        count: (existing?.count || 0) + 1 
      });
    }
  });

  return Array.from(valueMap.entries())
    .map(([value, { label, count }]) => ({ value, label, count }))
    .sort((a, b) => {
      // Put (Empty) at the end
      if (a.value === '__empty__') return 1;
      if (b.value === '__empty__') return -1;
      // Sort by count descending, then alphabetically
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });
}
