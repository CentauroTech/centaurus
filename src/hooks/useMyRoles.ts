import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { RoleType } from '@/hooks/useTeamMemberRoles';

interface MyRole {
  id: string;
  team_member_id: string;
  role_type: RoleType;
  created_at: string;
}

export function useMyRoles() {
  const { data: currentMember } = useCurrentTeamMember();

  return useQuery({
    queryKey: ['my-roles', currentMember?.id],
    queryFn: async () => {
      if (!currentMember?.id) return [];

      const { data, error } = await supabase
        .from('team_member_roles')
        .select('*')
        .eq('team_member_id', currentMember.id);

      if (error) throw error;
      return data as MyRole[];
    },
    enabled: !!currentMember?.id,
  });
}

export function useHasBillingRole() {
  const { data: roles, isLoading } = useMyRoles();
  return {
    hasBillingRole: roles?.some(r => r.role_type === 'billing') ?? false,
    isLoading,
  };
}
