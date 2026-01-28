import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PHASE_GUIDES, PhaseGuide } from '@/config/phaseGuides';
import { toast } from 'sonner';

export interface DbPhaseGuide {
  id: string;
  phase_key: string;
  title: string;
  color: string;
  overview: string;
  key_columns: { name: string; description: string }[];
  workflow: { step: number; action: string; detail: string }[];
  roles: { role: string; responsibility: string }[];
  next_phase: string | null;
  trigger_condition: string | null;
  created_at: string;
  updated_at: string;
}

export function usePhaseGuides() {
  return useQuery({
    queryKey: ['phase-guides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phase_guides')
        .select('*')
        .order('phase_key');

      if (error) throw error;
      return data as DbPhaseGuide[];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

export function usePhaseGuide(phaseKey: string | null) {
  const { data: dbGuides, isLoading } = usePhaseGuides();

  // Merge database guide with static fallback
  const guide = (() => {
    if (!phaseKey) return null;

    const normalizedKey = phaseKey.toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    // Check database first
    const dbGuide = dbGuides?.find(g => g.phase_key === normalizedKey);
    if (dbGuide) {
      return {
        title: dbGuide.title,
        color: dbGuide.color,
        overview: dbGuide.overview,
        keyColumns: dbGuide.key_columns,
        workflow: dbGuide.workflow,
        roles: dbGuide.roles,
        nextPhase: dbGuide.next_phase || '',
        triggerCondition: dbGuide.trigger_condition || '',
      } as PhaseGuide;
    }

    // Fall back to static config
    return PHASE_GUIDES[normalizedKey] || null;
  })();

  return { guide, isLoading };
}

export function useSavePhaseGuide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guide: {
      phase_key: string;
      title: string;
      color: string;
      overview: string;
      key_columns: { name: string; description: string }[];
      workflow: { step: number; action: string; detail: string }[];
      roles: { role: string; responsibility: string }[];
      next_phase: string | null;
      trigger_condition: string | null;
    }) => {
      const { error } = await supabase
        .from('phase_guides')
        .upsert(
          {
            phase_key: guide.phase_key,
            title: guide.title,
            color: guide.color,
            overview: guide.overview,
            key_columns: guide.key_columns,
            workflow: guide.workflow,
            roles: guide.roles,
            next_phase: guide.next_phase,
            trigger_condition: guide.trigger_condition,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'phase_key' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase-guides'] });
      toast.success('Guide saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save guide: ' + error.message);
    },
  });
}

export function useDeletePhaseGuide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (phaseKey: string) => {
      const { error } = await supabase
        .from('phase_guides')
        .delete()
        .eq('phase_key', phaseKey);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase-guides'] });
      toast.success('Guide reset to default');
    },
    onError: (error) => {
      toast.error('Failed to reset guide: ' + error.message);
    },
  });
}

// Get all phase keys (combining static and database)
export function useAllPhaseKeys() {
  const { data: dbGuides } = usePhaseGuides();
  
  const staticKeys = Object.keys(PHASE_GUIDES);
  const dbKeys = dbGuides?.map(g => g.phase_key) || [];
  
  // Merge and deduplicate
  const allKeys = [...new Set([...staticKeys, ...dbKeys])];
  return allKeys.sort();
}
