import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTeamMember } from './useCurrentTeamMember';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  bell_mentions: boolean;
  bell_assignments: boolean;
  email_mentions: boolean;
  email_assignments: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PREFERENCES = {
  bell_mentions: true,
  bell_assignments: true,
  email_mentions: true,
  email_assignments: true,
};

export function useNotificationPreferences() {
  const { data: currentMember } = useCurrentTeamMember();

  return useQuery({
    queryKey: ['notification-preferences', currentMember?.id],
    queryFn: async () => {
      if (!currentMember?.id) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', currentMember.id)
        .maybeSingle();

      if (error) throw error;
      
      // Return defaults if no preferences exist
      if (!data) {
        return {
          ...DEFAULT_PREFERENCES,
          user_id: currentMember.id,
        } as Partial<NotificationPreferences>;
      }
      
      return data as NotificationPreferences;
    },
    enabled: !!currentMember?.id,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { data: currentMember } = useCurrentTeamMember();

  return useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      if (!currentMember?.id) throw new Error('No current member');

      // Check if preferences exist
      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('user_id', currentMember.id)
        .maybeSingle();

      if (existing) {
        // Update existing preferences
        const { error } = await supabase
          .from('notification_preferences')
          .update(preferences)
          .eq('user_id', currentMember.id);

        if (error) throw error;
      } else {
        // Insert new preferences
        const { error } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: currentMember.id,
            ...DEFAULT_PREFERENCES,
            ...preferences,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', currentMember?.id] });
    },
  });
}
