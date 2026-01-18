import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type MemberType = 'god' | 'admin' | 'team_member' | 'guest';

export const MEMBER_TYPES: MemberType[] = ['god', 'admin', 'team_member', 'guest'];

export const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  god: 'God',
  admin: 'Admin',
  team_member: 'Team Member',
  guest: 'Guest',
};

export const MEMBER_TYPE_DESCRIPTIONS: Record<MemberType, string> = {
  god: 'Full access with structural changes',
  admin: 'View everything, no structural changes',
  team_member: 'View based on column visibility settings',
  guest: 'Only see assigned tasks',
};

export function useUpdateTeamMemberType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      teamMemberId, 
      type 
    }: { 
      teamMemberId: string; 
      type: MemberType;
    }) => {
      const { error } = await supabase
        .from('team_members')
        .update({ role: type })
        .eq('id', teamMemberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members-settings'] });
      queryClient.invalidateQueries({ queryKey: ['team-member-role'] });
      toast.success('Member type updated');
    },
    onError: (error: Error) => {
      console.error('Error updating member type:', error);
      toast.error('Failed to update member type');
    },
  });
}
