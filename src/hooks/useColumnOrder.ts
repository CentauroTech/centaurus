import { useState, useEffect, useCallback, useMemo } from 'react';
import { ColumnConfig, COLUMNS, COLUMNS_COLOMBIA } from '@/types/board';
import { usePermissions } from './usePermissions';
import { useColumnVisibility } from './useColumnVisibility';

interface ColumnOrderState {
  order: string[]; // Array of column IDs in order
  isLocked: boolean;
}

const STORAGE_KEY_PREFIX = 'board-column-order-';

function getStorageKey(boardId: string): string {
  return `${STORAGE_KEY_PREFIX}${boardId}`;
}

// Clear all Miami board column orders from localStorage
export function clearAllMiamiBoardOrders(): void {
  if (typeof window === 'undefined') return;
  
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  console.log(`Cleared ${keysToRemove.length} board column order(s) from localStorage`);
}

// Sync column order from source board to all other boards in the same workspace
export function syncColumnOrderToWorkspace(sourceBoardId: string, allBoardIds: string[]): void {
  if (typeof window === 'undefined') return;
  
  const sourceKey = getStorageKey(sourceBoardId);
  const sourceData = localStorage.getItem(sourceKey);
  
  if (!sourceData) {
    console.log('No source column order found, nothing to sync');
    return;
  }
  
  let synced = 0;
  allBoardIds.forEach(boardId => {
    if (boardId !== sourceBoardId) {
      localStorage.setItem(getStorageKey(boardId), sourceData);
      synced++;
    }
  });
  
  console.log(`Synced column order from ${sourceBoardId} to ${synced} other board(s)`);
}

export function useColumnOrder(boardId: string, workspaceName: string) {
  const { isGod, isAdmin, isTeamMember } = usePermissions();
  const { data: columnVisibility } = useColumnVisibility();
  
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

  // Create column visibility map for quick lookup
  const columnVisibilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    columnVisibility?.forEach((cv) => {
      map.set(cv.column_id, cv.visible_to_team_members);
    });
    return map;
  }, [columnVisibility]);

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

  // Get ordered columns, filtering based on permissions and visibility settings
  const orderedColumns: ColumnConfig[] = useMemo(() => {
    return state.order
      .map(id => defaultColumns.find(col => col.id === id))
      .filter((col): col is ColumnConfig => {
        if (col === undefined) return false;
        
        // Filter out admin-only columns for non-admins (legacy check)
        if (col.adminOnly && !isGod && !isAdmin) return false;
        
        // God and Admin can see all columns
        if (isGod || isAdmin) return true;
        
        // For team members, check column visibility settings
        if (isTeamMember) {
          // If no visibility settings exist yet, show all columns
          if (columnVisibilityMap.size === 0) return true;
          
          // Check if this column is visible to team members
          const isVisible = columnVisibilityMap.get(col.id);
          // Default to visible if not in the map
          if (isVisible === undefined) return true;
          return isVisible;
        }
        
        // Guests see all columns by default (they have limited task access anyway)
        return true;
      });
  }, [state.order, defaultColumns, isGod, isAdmin, isTeamMember, columnVisibilityMap]);

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
    columnOrder: state.order,
    isLocked: state.isLocked,
    reorderColumns,
    toggleLock,
    resetOrder,
  };
}