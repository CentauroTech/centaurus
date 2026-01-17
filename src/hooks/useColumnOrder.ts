import { useState, useEffect, useCallback } from 'react';
import { ColumnConfig, COLUMNS, COLUMNS_COLOMBIA } from '@/types/board';

interface ColumnOrderState {
  order: string[]; // Array of column IDs in order
  isLocked: boolean;
}

const STORAGE_KEY_PREFIX = 'board-column-order-';

function getStorageKey(boardId: string): string {
  return `${STORAGE_KEY_PREFIX}${boardId}`;
}

export function useColumnOrder(boardId: string, workspaceName: string) {
  // Get default columns based on workspace
  const defaultColumns = workspaceName === 'Colombia' ? COLUMNS_COLOMBIA : COLUMNS;
  const defaultOrder = defaultColumns.map(col => col.id);
  
  const [state, setState] = useState<ColumnOrderState>(() => {
    if (typeof window === 'undefined') {
      return { order: defaultOrder, isLocked: false };
    }
    
    try {
      const stored = localStorage.getItem(getStorageKey(boardId));
      if (stored) {
        const parsed = JSON.parse(stored) as ColumnOrderState;
        // Validate that all stored column IDs still exist
        const validOrder = parsed.order.filter(id => 
          defaultColumns.some(col => col.id === id)
        );
        // Add any new columns that weren't in storage
        const newColumns = defaultColumns
          .filter(col => !validOrder.includes(col.id))
          .map(col => col.id);
        
        return {
          order: [...validOrder, ...newColumns],
          isLocked: parsed.isLocked ?? false,
        };
      }
    } catch (e) {
      console.error('Failed to parse column order from localStorage:', e);
    }
    
    return { order: defaultOrder, isLocked: false };
  });

  // Update state when boardId changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(boardId));
      if (stored) {
        const parsed = JSON.parse(stored) as ColumnOrderState;
        const validOrder = parsed.order.filter(id => 
          defaultColumns.some(col => col.id === id)
        );
        const newColumns = defaultColumns
          .filter(col => !validOrder.includes(col.id))
          .map(col => col.id);
        
        setState({
          order: [...validOrder, ...newColumns],
          isLocked: parsed.isLocked ?? false,
        });
      } else {
        setState({ order: defaultOrder, isLocked: false });
      }
    } catch (e) {
      setState({ order: defaultOrder, isLocked: false });
    }
  }, [boardId, workspaceName]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(getStorageKey(boardId), JSON.stringify(state));
      } catch (e) {
        console.error('Failed to save column order to localStorage:', e);
      }
    }
  }, [boardId, state]);

  // Get ordered columns
  const orderedColumns: ColumnConfig[] = state.order
    .map(id => defaultColumns.find(col => col.id === id))
    .filter((col): col is ColumnConfig => col !== undefined);

  // Reorder columns
  const reorderColumns = useCallback((activeId: string, overId: string) => {
    if (state.isLocked) return;
    
    setState(prev => {
      const oldIndex = prev.order.indexOf(activeId);
      const newIndex = prev.order.indexOf(overId);
      
      if (oldIndex === -1 || newIndex === -1) return prev;
      if (oldIndex === newIndex) return prev;
      
      // First 3 columns (indices 0, 1, 2 in order) are sticky and shouldn't be moved
      if (oldIndex <= 2 || newIndex <= 2) return prev;
      
      const newOrder = [...prev.order];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, activeId);
      
      console.log('Column reorder:', { activeId, overId, oldIndex, newIndex, newOrder });
      
      return { ...prev, order: newOrder };
    });
  }, [state.isLocked]);

  // Toggle lock
  const toggleLock = useCallback(() => {
    setState(prev => ({ ...prev, isLocked: !prev.isLocked }));
  }, []);

  // Reset to default order
  const resetOrder = useCallback(() => {
    setState({ order: defaultOrder, isLocked: false });
  }, [defaultOrder]);

  return {
    columns: orderedColumns,
    isLocked: state.isLocked,
    reorderColumns,
    toggleLock,
    resetOrder,
  };
}
