import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { COLUMNS } from '@/types/board';

interface ColumnVisibility {
  id: string;
  column_id: string;
  column_label: string;
  visible_to_team_members: boolean;
  created_at: string;
  updated_at: string;
}

interface ColumnMemberVisibility {
  id: string;
  column_id: string;
  team_member_id: string;
  created_at: string;
}

export function useColumnVisibility() {
  return useQuery({
    queryKey: ['column-visibility'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('column_visibility')
        .select('*')
        .order('column_label');
      
      if (error) throw error;
      return data as ColumnVisibility[];
    },
  });
}

export function useColumnMemberVisibility() {
  return useQuery({
    queryKey: ['column-member-visibility'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('column_member_visibility')
        .select('*');
      
      if (error) throw error;
      return data as ColumnMemberVisibility[];
    },
  });
}

export function useUpdateColumnVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      columnId, 
      columnLabel, 
      visibleToTeamMembers 
    }: { 
      columnId: string; 
      columnLabel: string; 
      visibleToTeamMembers: boolean;
    }) => {
      const { error } = await supabase
        .from('column_visibility')
        .upsert(
          { 
            column_id: columnId, 
            column_label: columnLabel,
            visible_to_team_members: visibleToTeamMembers,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'column_id' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['column-visibility'] });
      toast.success('Column visibility updated');
    },
    onError: (error: Error) => {
      console.error('Error updating column visibility:', error);
      toast.error('Failed to update column visibility');
    },
  });
}

export function useSetColumnMemberVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      columnId,
      teamMemberIds,
    }: {
      columnId: string;
      teamMemberIds: string[];
    }) => {
      // Delete existing entries for this column
      const { error: deleteError } = await supabase
        .from('column_member_visibility')
        .delete()
        .eq('column_id', columnId);

      if (deleteError) throw deleteError;

      // Insert new entries
      if (teamMemberIds.length > 0) {
        const rows = teamMemberIds.map(id => ({
          column_id: columnId,
          team_member_id: id,
        }));
        const { error: insertError } = await supabase
          .from('column_member_visibility')
          .insert(rows);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['column-member-visibility'] });
      toast.success('Column member visibility updated');
    },
    onError: (error: Error) => {
      console.error('Error updating column member visibility:', error);
      toast.error('Failed to update column member visibility');
    },
  });
}

export function useInitializeColumnVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: existing, error: fetchError } = await supabase
        .from('column_visibility')
        .select('column_id');
      
      if (fetchError) throw fetchError;

      const existingIds = new Set(existing?.map(c => c.column_id) || []);
      
      const columnsToInsert = COLUMNS
        .filter(col => !existingIds.has(col.id))
        .map(col => ({
          column_id: col.id,
          column_label: col.label || col.id,
          visible_to_team_members: true,
        }));

      if (columnsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('column_visibility')
          .insert(columnsToInsert);
        
        if (insertError) throw insertError;
      }

      return columnsToInsert.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['column-visibility'] });
      if (count > 0) {
        toast.success(`Initialized ${count} column visibility settings`);
      }
    },
    onError: (error: Error) => {
      console.error('Error initializing column visibility:', error);
      toast.error('Failed to initialize column visibility');
    },
  });
}