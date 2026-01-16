import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useTaskSelection } from './TaskSelectionContext';
import { User } from '@/types/board';

export interface BulkUpdateParams {
  taskIds: string[];
  field: string;
  value: any;
  displayField?: string;
}

interface BulkEditContextType {
  shouldApplyBulkEdit: (currentTaskId: string) => boolean;
  getSelectedTaskIds: () => string[];
  selectedCount: number;
  onBulkUpdate?: (params: BulkUpdateParams) => void;
}

const BulkEditContext = createContext<BulkEditContextType | null>(null);

interface BulkEditProviderProps {
  children: ReactNode;
  onBulkUpdate?: (params: BulkUpdateParams) => void;
}

export function BulkEditProvider({ children, onBulkUpdate }: BulkEditProviderProps) {
  const { selectedTaskIds } = useTaskSelection();

  const shouldApplyBulkEdit = useCallback((currentTaskId: string) => {
    // Only apply bulk edit if more than 1 task selected AND current task is one of them
    return selectedTaskIds.size > 1 && selectedTaskIds.has(currentTaskId);
  }, [selectedTaskIds]);

  const getSelectedTaskIds = useCallback(() => {
    return Array.from(selectedTaskIds);
  }, [selectedTaskIds]);

  return (
    <BulkEditContext.Provider
      value={{
        shouldApplyBulkEdit,
        getSelectedTaskIds,
        selectedCount: selectedTaskIds.size,
        onBulkUpdate,
      }}
    >
      {children}
    </BulkEditContext.Provider>
  );
}

export function useBulkEdit() {
  const context = useContext(BulkEditContext);
  if (!context) {
    throw new Error('useBulkEdit must be used within a BulkEditProvider');
  }
  return context;
}
