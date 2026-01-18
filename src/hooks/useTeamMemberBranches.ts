import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const BRANCHES = ['Colombia', 'Miami', 'Brazil', 'Mexico'] as const;
export type Branch = typeof BRANCHES[number];

interface TeamMemberBranch {
  id: string;
  team_member_id: string;
  branch: Branch;
  created_at: string;
}

export function useTeamMemberBranches() {
  return useQuery({
    queryKey: ['team-member-branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_member_branches')
        .select('*');

      if (error) throw error;
      return data as TeamMemberBranch[];
    },
  });
}

export function useTeamMemberBranchesMap() {
  const { data: branches } = useTeamMemberBranches();
  
  // Create a map of team_member_id -> branches[]
  const branchesMap = new Map<string, Branch[]>();
  
  branches?.forEach((b) => {
    const existing = branchesMap.get(b.team_member_id) || [];
    branchesMap.set(b.team_member_id, [...existing, b.branch as Branch]);
  });
  
  return branchesMap;
}

export function useUpdateTeamMemberBranches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      teamMemberId, 
      branches 
    }: { 
      teamMemberId: string; 
      branches: Branch[] 
    }) => {
      // Delete all existing branches for this member
      const { error: deleteError } = await supabase
        .from('team_member_branches')
        .delete()
        .eq('team_member_id', teamMemberId);

      if (deleteError) throw deleteError;

      // Insert new branches
      if (branches.length > 0) {
        const { error: insertError } = await supabase
          .from('team_member_branches')
          .insert(
            branches.map((branch) => ({
              team_member_id: teamMemberId,
              branch,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-member-branches'] });
      toast({
        title: 'Branches updated',
        description: 'Team member branches have been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating branches',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
