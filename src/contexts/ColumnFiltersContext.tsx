import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
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

interface ColumnFiltersContextType {
  filters: ColumnFiltersState;
  setFilter: (columnId: string, field: keyof Task, value: FilterValue, type?: ColumnFilter['type']) => void;
  clearFilter: (columnId: string) => void;
  clearAllFilters: () => void;
  filterTasks: (tasks: Task[]) => Task[];
  activeFilterCount: number;
  hasActiveFilters: boolean;
}

const ColumnFiltersContext = createContext<ColumnFiltersContextType | null>(null);

export function ColumnFiltersProvider({ children }: { children: ReactNode }) {
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

  return (
    <ColumnFiltersContext.Provider value={{
      filters,
      setFilter,
      clearFilter,
      clearAllFilters,
      filterTasks,
      activeFilterCount,
      hasActiveFilters
    }}>
      {children}
    </ColumnFiltersContext.Provider>
  );
}

export function useColumnFilters() {
  const context = useContext(ColumnFiltersContext);
  if (!context) {
    throw new Error('useColumnFilters must be used within a ColumnFiltersProvider');
  }
  return context;
}
