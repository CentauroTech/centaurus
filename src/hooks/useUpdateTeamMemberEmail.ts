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

      // If email was set (not cleared), provision an auth user with default password
      if (email?.trim()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await supabase.functions.invoke('provision-auth-user', {
            body: { email: email.trim(), teamMemberId },
          });

          if (response.error) {
            console.warn('Failed to provision auth user:', response.error);
          } else {
            console.log('Auth user provisioned:', response.data);
          }
        } catch (e) {
          console.warn('Error provisioning auth user:', e);
        }
      }
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
