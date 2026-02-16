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
  // Column-level filters
  filters: ColumnFiltersState;
  setFilter: (columnId: string, field: keyof Task, value: FilterValue, type?: ColumnFilter['type']) => void;
  clearFilter: (columnId: string) => void;
  clearAllFilters: () => void;
  filterTasks: (tasks: Task[]) => Task[];
  activeFilterCount: number;
  hasActiveFilters: boolean;
  
  // Global search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Quick filters
  statusFilters: string[];
  setStatusFilters: (statuses: string[]) => void;
  personFilters: string[];
  setPersonFilters: (personIds: string[]) => void;
  clientFilters: string[];
  setClientFilters: (clients: string[]) => void;
  phaseFilters: string[];
  setPhaseFilters: (phases: string[]) => void;
}

const ColumnFiltersContext = createContext<ColumnFiltersContextType | null>(null);

export function ColumnFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<ColumnFiltersState>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [personFilters, setPersonFilters] = useState<string[]>([]);
  const [clientFilters, setClientFilters] = useState<string[]>([]);
  const [phaseFilters, setPhaseFilters] = useState<string[]>([]);

  const setFilter = useCallback((columnId: string, field: keyof Task, value: FilterValue, type: ColumnFilter['type'] = 'equals') => {
    setFilters(prev => {
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
    setSearchQuery('');
    setStatusFilters([]);
    setPersonFilters([]);
    setClientFilters([]);
    setPhaseFilters([]);
  }, []);

  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).length + 
      (searchQuery ? 1 : 0) + 
      statusFilters.length + 
      personFilters.length + 
      clientFilters.length +
      phaseFilters.length;
  }, [filters, searchQuery, statusFilters, personFilters, clientFilters, phaseFilters]);

  const hasActiveFilters = activeFilterCount > 0;

  // Filter tasks based on all active filters
  const filterTasks = useCallback((tasks: Task[]): Task[] => {
    if (!hasActiveFilters) return tasks;

    return tasks.filter(task => {
      // Global search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableFields = [
          task.name,
          task.workOrderNumber,
          task.tituloAprobadoEspanol,
          task.clientName,
          task.projectManager?.name,
          task.director?.name,
        ].filter(Boolean);
        
        const matches = searchableFields.some(field => 
          String(field).toLowerCase().includes(query)
        );
        if (!matches) return false;
      }

      // Status filters
      if (statusFilters.length > 0) {
        if (!statusFilters.includes(task.status)) return false;
      }

      // Phase filters
      if (phaseFilters.length > 0) {
        const taskPhase = task.currentPhase || task.fase || '';
        if (!phaseFilters.includes(taskPhase)) return false;
      }

      // Person filters
      if (personFilters.length > 0) {
        const taskPersonIds = [
          task.projectManager?.id,
          task.director?.id,
          task.traductor?.id,
          task.adaptador?.id,
          task.mixerBogota?.id,
          task.mixerMiami?.id,
          task.qc1?.id,
          task.qcRetakes?.id,
          task.qcMix?.id,
          task.tecnico?.id,
          ...(task.people?.map(p => p.id) || [])
        ].filter(Boolean);
        
        const hasMatchingPerson = personFilters.some(pid => taskPersonIds.includes(pid));
        if (!hasMatchingPerson) return false;
      }

      // Client filters
      if (clientFilters.length > 0) {
        if (!task.clientName || !clientFilters.includes(task.clientName)) return false;
      }

      // Column-level filters
      const columnFiltersPass = Object.values(filters).every(filter => {
        const taskValue = task[filter.field];

        switch (filter.type) {
          case 'equals':
            if (taskValue === undefined || taskValue === null) {
              return filter.value === null || filter.value === '';
            }
            if (typeof taskValue === 'object' && taskValue !== null && 'id' in taskValue) {
              return (taskValue as User).id === filter.value;
            }
            return String(taskValue) === String(filter.value);

          case 'contains':
            if (taskValue === undefined || taskValue === null) return false;
            return String(taskValue).toLowerCase().includes(String(filter.value).toLowerCase());

          case 'includes':
            if (Array.isArray(filter.value)) {
              if (Array.isArray(taskValue)) {
                return filter.value.some(v => (taskValue as string[]).includes(v));
              }
              if (typeof taskValue === 'object' && taskValue !== null && 'id' in taskValue) {
                return filter.value.includes((taskValue as User).id);
              }
              return filter.value.includes(String(taskValue));
            }
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

      return columnFiltersPass;
    });
  }, [filters, hasActiveFilters, searchQuery, statusFilters, personFilters, clientFilters, phaseFilters]);

  return (
    <ColumnFiltersContext.Provider value={{
      filters,
      setFilter,
      clearFilter,
      clearAllFilters,
      filterTasks,
      activeFilterCount,
      hasActiveFilters,
      searchQuery,
      setSearchQuery,
      statusFilters,
      setStatusFilters,
      personFilters,
      setPersonFilters,
      clientFilters,
      setClientFilters,
      phaseFilters,
      setPhaseFilters,
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
