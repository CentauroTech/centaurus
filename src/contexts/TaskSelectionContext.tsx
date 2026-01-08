import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TaskSelectionContextType {
  selectedTaskIds: Set<string>;
  isSelecting: boolean;
  toggleTaskSelection: (taskId: string) => void;
  selectTask: (taskId: string) => void;
  deselectTask: (taskId: string) => void;
  selectAll: (taskIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (taskId: string) => boolean;
}

const TaskSelectionContext = createContext<TaskSelectionContextType | null>(null);

export function TaskSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => new Set(prev).add(taskId));
  }, []);

  const deselectTask = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  }, []);

  const selectAll = useCallback((taskIds: string[]) => {
    setSelectedTaskIds(new Set(taskIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  const isSelected = useCallback((taskId: string) => {
    return selectedTaskIds.has(taskId);
  }, [selectedTaskIds]);

  const isSelecting = selectedTaskIds.size > 0;

  return (
    <TaskSelectionContext.Provider
      value={{
        selectedTaskIds,
        isSelecting,
        toggleTaskSelection,
        selectTask,
        deselectTask,
        selectAll,
        clearSelection,
        isSelected,
      }}
    >
      {children}
    </TaskSelectionContext.Provider>
  );
}

export function useTaskSelection() {
  const context = useContext(TaskSelectionContext);
  if (!context) {
    throw new Error('useTaskSelection must be used within a TaskSelectionProvider');
  }
  return context;
}
