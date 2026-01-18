import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const ROLE_TYPES = ['translator', 'adapter', 'premix', 'mixer', 'qc_premix', 'qc_mix', 'director', 'tecnico'] as const;
export type RoleType = typeof ROLE_TYPES[number];

export const ROLE_LABELS: Record<RoleType, string> = {
  translator: 'Translator',
  adapter: 'Adapter',
  premix: 'Premix',
  mixer: 'Mixer',
  qc_premix: 'QC Premix',
  qc_mix: 'QC Mix',
  director: 'Director',
  tecnico: 'Técnico',
};

interface TeamMemberRole {
  id: string;
  team_member_id: string;
  role_type: RoleType;
  created_at: string;
}

export function useTeamMemberRoles() {
  return useQuery({
    queryKey: ['team-member-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_member_roles')
        .select('*');

      if (error) throw error;
      return data as TeamMemberRole[];
    },
  });
}

export function useTeamMemberRolesMap() {
  const { data: roles } = useTeamMemberRoles();
  
  // Create a map of team_member_id -> roles[]
  const rolesMap = new Map<string, RoleType[]>();
  
  roles?.forEach((r) => {
    const existing = rolesMap.get(r.team_member_id) || [];
    rolesMap.set(r.team_member_id, [...existing, r.role_type as RoleType]);
  });
  
  return rolesMap;
}

export function useUpdateTeamMemberRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      teamMemberId, 
      roles 
    }: { 
      teamMemberId: string; 
      roles: RoleType[] 
    }) => {
      // Delete all existing roles for this member
      const { error: deleteError } = await supabase
        .from('team_member_roles')
        .delete()
        .eq('team_member_id', teamMemberId);

      if (deleteError) throw deleteError;

      // Insert new roles
      if (roles.length > 0) {
        const { error: insertError } = await supabase
          .from('team_member_roles')
          .insert(
            roles.map((role_type) => ({
              team_member_id: teamMemberId,
              role_type,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-member-roles'] });
      toast({
        title: 'Roles updated',
        description: 'Team member roles have been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating roles',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
