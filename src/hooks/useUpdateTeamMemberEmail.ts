import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUpdateTeamMemberEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamMemberId, email }: { teamMemberId: string; email: string | null }) => {
      const { error } = await supabase
        .from('team_members')
        .update({ email: email?.trim() || null })
        .eq('id', teamMemberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members-settings'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Email updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update email: ${error.message}`);
    },
  });
}
