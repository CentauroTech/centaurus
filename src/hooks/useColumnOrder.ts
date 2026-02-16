import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnConfig, COLUMNS, PHASE_DUE_DATE_MAP } from '@/types/board';
import { usePermissions } from './usePermissions';
import { useColumnVisibility, useColumnMemberVisibility } from './useColumnVisibility';
import { useCurrentTeamMember } from './useCurrentTeamMember';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ColumnOrderState {
  order: string[]; // Array of column IDs in order
  isLocked: boolean;
}

// Fetch column order from DB for a board
function useBoardColumnOrder(boardId: string) {
  return useQuery({
    queryKey: ['board-column-order', boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('board_column_orders')
        .select('*')
        .eq('board_id', boardId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!boardId,
  });
}

// Sync column order from source board to all other boards in the same workspace (DB-backed)
export async function syncColumnOrderToWorkspace(sourceBoardId: string, allBoardIds: string[], currentUserId: string | null): Promise<void> {
  // Read the source board's column order
  const { data: source, error: readError } = await supabase
    .from('board_column_orders')
    .select('column_order, is_locked')
    .eq('board_id', sourceBoardId)
    .maybeSingle();

  if (readError || !source) {
    console.log('No source column order found in DB, nothing to sync');
    return;
  }

  const targetBoardIds = allBoardIds.filter(id => id !== sourceBoardId);

  // Upsert for each target board
  await Promise.all(
    targetBoardIds.map(async (boardId) => {
      const { error } = await supabase
        .from('board_column_orders')
        .upsert(
          {
            board_id: boardId,
            column_order: source.column_order,
            is_locked: source.is_locked,
            updated_by: currentUserId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'board_id' }
        );
      if (error) console.error('Failed to sync column order to board:', boardId, error);
    })
  );

  console.log(`Synced column order from ${sourceBoardId} to ${targetBoardIds.length} other board(s)`);
}

export function useColumnOrder(boardId: string, workspaceName: string, boardName?: string) {
  const { isGod, isAdmin, isTeamMember } = usePermissions();
  const { data: columnVisibility } = useColumnVisibility();
  const { data: memberVisibility } = useColumnMemberVisibility();
  const { data: currentTeamMember } = useCurrentTeamMember();
  const queryClient = useQueryClient();
  
  // Get default columns based on workspace, with dynamic phase due date label
  const defaultColumns = useMemo(() => {
    const base = COLUMNS;
    if (!boardName) return base;
    
    // For Miami boards, replace phaseDueDate column with the phase-specific due date column
    const boardLower = boardName.toLowerCase();
    let matchedPhase: { field: string; label: string } | null = null;
    for (const [phaseKey, config] of Object.entries(PHASE_DUE_DATE_MAP)) {
      if (boardLower.includes(phaseKey)) {
        matchedPhase = config;
        break;
      }
    }
    
    if (matchedPhase) {
      return base.map(col => {
        if (col.id === 'phaseDueDate') {
          return {
            ...col,
            label: matchedPhase!.label,
            field: matchedPhase!.field as any,
          };
        }
        return col;
      });
    }
    
    return base;
  }, [workspaceName, boardName]);
  const defaultOrder = defaultColumns.map(col => col.id);

  // Fetch DB-persisted column order
  const { data: dbColumnOrder } = useBoardColumnOrder(boardId);

  // Derive state from DB or defaults
  const state: ColumnOrderState = useMemo(() => {
    if (dbColumnOrder && Array.isArray(dbColumnOrder.column_order) && dbColumnOrder.column_order.length > 0) {
      const storedOrder = dbColumnOrder.column_order as string[];
      // Validate stored IDs still exist
      const validOrder = storedOrder.filter(id => defaultColumns.some(col => col.id === id));
      // Add any new columns not in stored order
      const newColumns = defaultColumns
        .filter(col => !validOrder.includes(col.id))
        .map(col => col.id);
      return {
        order: [...validOrder, ...newColumns],
        isLocked: dbColumnOrder.is_locked ?? false,
      };
    }
    return { order: defaultOrder, isLocked: false };
  }, [dbColumnOrder, defaultColumns, defaultOrder]);

  // Mutation to save column order to DB
  const saveOrderMutation = useMutation({
    mutationFn: async (newState: ColumnOrderState) => {
      const { error } = await supabase
        .from('board_column_orders')
        .upsert(
          {
            board_id: boardId,
            column_order: newState.order as any,
            is_locked: newState.isLocked,
            updated_by: currentTeamMember?.id || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'board_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-column-order', boardId] });
    },
    onError: (err) => {
      console.error('Failed to save column order:', err);
      toast.error('Failed to save column order');
    },
  });

  // Create column visibility map for quick lookup
  const columnVisibilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    columnVisibility?.forEach((cv) => {
      map.set(cv.column_id, cv.visible_to_team_members);
    });
    return map;
  }, [columnVisibility]);

  // Create per-member visibility map: column_id -> Set of team_member_ids
  const memberVisibilityMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    memberVisibility?.forEach((mv) => {
      if (!map.has(mv.column_id)) {
        map.set(mv.column_id, new Set());
      }
      map.get(mv.column_id)!.add(mv.team_member_id);
    });
    return map;
  }, [memberVisibility]);

  // Get ordered columns, filtering based on permissions and visibility settings
  const orderedColumns: ColumnConfig[] = useMemo(() => {
    return state.order
      .map(id => defaultColumns.find(col => col.id === id))
      .filter((col): col is ColumnConfig => {
        if (col === undefined) return false;
        
        // Privacy column: god, admin, and team members can see it (not guests)
        if (col.id === 'isPrivate' && !isGod && !isAdmin && !isTeamMember) return false;
        
        // Filter out admin-only columns for non-admins (legacy check)
        if (col.adminOnly && !isGod && !isAdmin) return false;
        
        // God and Admin can see all columns
        if (isGod || isAdmin) return true;
        
        // For team members, check per-member visibility
        if (isTeamMember && currentTeamMember?.id) {
          const memberSet = memberVisibilityMap.get(col.id);
          // If specific members are assigned to this column, check if current user is in the set
          if (memberSet && memberSet.size > 0) {
            return memberSet.has(currentTeamMember.id);
          }
          // If no per-member assignments, fall back to general visibility
          if (columnVisibilityMap.size > 0) {
            const isVisible = columnVisibilityMap.get(col.id);
            if (isVisible === undefined) return true;
            return isVisible;
          }
          return true;
        }
        
        // Guests see all columns by default (they have limited task access anyway)
        return true;
      });
  }, [state.order, defaultColumns, isGod, isAdmin, isTeamMember, columnVisibilityMap, memberVisibilityMap, currentTeamMember]);

  // Reorder columns (saves to DB)
  const reorderColumns = useCallback((activeId: string, overId: string) => {
    if (state.isLocked) return;
    
    const oldIndex = state.order.indexOf(activeId);
    const newIndex = state.order.indexOf(overId);
    
    if (oldIndex === -1 || newIndex === -1) return;
    if (oldIndex === newIndex) return;
    
    // First 3 columns (indices 0, 1, 2 in order) are sticky and shouldn't be moved
    if (oldIndex <= 2 || newIndex <= 2) return;
    
    const newOrder = [...state.order];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, activeId);
    
    saveOrderMutation.mutate({ order: newOrder, isLocked: state.isLocked });
  }, [state, saveOrderMutation]);

  // Toggle lock (saves to DB)
  const toggleLock = useCallback(() => {
    const newState = { ...state, isLocked: !state.isLocked };
    saveOrderMutation.mutate(newState);
  }, [state, saveOrderMutation]);

  // Reset to default order (saves to DB)
  const resetOrder = useCallback(() => {
    saveOrderMutation.mutate({ order: defaultOrder, isLocked: false });
  }, [defaultOrder, saveOrderMutation]);

  return {
    columns: orderedColumns,
    columnOrder: state.order,
    isLocked: state.isLocked,
    reorderColumns,
    toggleLock,
    resetOrder,
  };
}
