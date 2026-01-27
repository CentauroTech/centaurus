import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTeamMember } from './useCurrentTeamMember';

interface GuidePreference {
  id: string;
  user_id: string;
  board_id: string;
  dont_show_again: boolean;
}

export function useBoardGuidePreference(boardId: string, boardName: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCheckedPreference, setHasCheckedPreference] = useState(false);
  const queryClient = useQueryClient();
  const { data: currentTeamMember } = useCurrentTeamMember();
  const userId = currentTeamMember?.id;

  // Query to check if user has preference for this board
  const { data: preference, isLoading } = useQuery({
    queryKey: ['board-guide-preference', boardId, userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('user_guide_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('board_id', boardId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching guide preference:', error);
        return null;
      }
      return data as GuidePreference | null;
    },
    enabled: !!userId && !!boardId,
  });

  // Auto-show guide on first visit if no preference set
  useEffect(() => {
    if (isLoading || !boardName || hasCheckedPreference) return;
    
    // If no preference exists (first time) or preference says show guide
    if (!preference || !preference.dont_show_again) {
      // Only auto-show if this is the first time (no preference record exists)
      if (!preference) {
        const timer = setTimeout(() => setIsOpen(true), 500);
        return () => clearTimeout(timer);
      }
    }
    setHasCheckedPreference(true);
  }, [preference, isLoading, boardName, hasCheckedPreference]);

  // Mutation to save preference
  const savePreferenceMutation = useMutation({
    mutationFn: async (dontShowAgain: boolean) => {
      if (!userId) throw new Error('User not authenticated');

      // Upsert the preference
      const { error } = await supabase
        .from('user_guide_preferences')
        .upsert(
          {
            user_id: userId,
            board_id: boardId,
            dont_show_again: dontShowAgain,
          },
          {
            onConflict: 'user_id,board_id',
          }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-guide-preference', boardId, userId] });
    },
  });

  const openGuide = () => setIsOpen(true);

  const closeGuide = (dontShowAgain: boolean = false) => {
    setIsOpen(false);
    if (dontShowAgain && userId) {
      savePreferenceMutation.mutate(true);
    }
  };

  const resetGuide = () => {
    if (userId) {
      savePreferenceMutation.mutate(false);
    }
  };

  return { isOpen, openGuide, closeGuide, resetGuide, isLoading };
}
