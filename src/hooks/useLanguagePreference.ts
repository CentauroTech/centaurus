import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTeamMember } from './useCurrentTeamMember';

export type Language = 'en' | 'es';

export function useLanguagePreference() {
  const { data: currentMember } = useCurrentTeamMember();
  const queryClient = useQueryClient();

  const { data: language = 'en' as Language } = useQuery({
    queryKey: ['language-preference', currentMember?.id],
    queryFn: async (): Promise<Language> => {
      if (!currentMember?.id) return 'en';

      const { data, error } = await supabase
        .from('user_language_preferences')
        .select('language')
        .eq('team_member_id', currentMember.id)
        .maybeSingle();

      if (error) throw error;
      return (data?.language as Language) || 'en';
    },
    enabled: !!currentMember?.id,
    staleTime: Infinity,
  });

  const updateLanguage = useMutation({
    mutationFn: async (newLanguage: Language) => {
      if (!currentMember?.id) throw new Error('No team member');

      const { error } = await supabase
        .from('user_language_preferences')
        .upsert(
          { team_member_id: currentMember.id, language: newLanguage },
          { onConflict: 'team_member_id' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['language-preference'] });
    },
  });

  return { language, updateLanguage };
}
