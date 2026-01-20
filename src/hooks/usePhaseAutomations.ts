import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// All available phases in order
export const PHASES = [
  'kickoff',
  'assets',
  'translation',
  'adapting',
  'voicetests',
  'recording',
  'premix',
  'qcpremix',
  'retakes',
  'qcretakes',
  'mix',
  'qcmix',
  'mixretakes',
  'deliveries',
] as const;

export type Phase = typeof PHASES[number];

// Human-readable phase labels
export const PHASE_LABELS: Record<Phase, string> = {
  kickoff: 'Kickoff',
  assets: 'Assets',
  translation: 'Translation',
  adapting: 'Adapting',
  voicetests: 'Voice Tests',
  recording: 'Recording',
  premix: 'Premix',
  qcpremix: 'QC Premix',
  retakes: 'Retakes',
  qcretakes: 'QC Retakes',
  mix: 'Mix',
  qcmix: 'QC Mix',
  mixretakes: 'Mix Retakes',
  deliveries: 'Deliveries',
};

interface PhaseAutomation {
  id: string;
  phase: string;
  team_member_id: string;
  workspace_id: string;
  created_at: string;
}

interface PhaseAutomationWithMember extends PhaseAutomation {
  team_member: {
    id: string;
    name: string;
    initials: string;
    color: string;
  };
}

// Fetch all phase automations with team member details, optionally filtered by workspace
export function usePhaseAutomations(workspaceId?: string) {
  return useQuery({
    queryKey: ['phase-automations', workspaceId],
    queryFn: async () => {
      let query = supabase
        .from('phase_automations')
        .select(`
          id,
          phase,
          team_member_id,
          workspace_id,
          created_at,
          team_member:team_members(id, name, initials, color)
        `)
        .order('phase')
        .order('created_at');

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform data to flatten team_member
      return (data as any[]).map(item => ({
        ...item,
        team_member: item.team_member,
      })) as PhaseAutomationWithMember[];
    },
  });
}

// Fetch phase automations as a map for use in phase progression
export function usePhaseAutomationsMap(workspaceId?: string) {
  return useQuery({
    queryKey: ['phase-automations-map', workspaceId],
    queryFn: async () => {
      let query = supabase
        .from('phase_automations')
        .select(`
          phase,
          team_member_id,
          workspace_id,
          team_member:team_members(id, name)
        `);

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Build map of phase -> team member IDs
      const map = new Map<string, string[]>();
      (data as any[]).forEach(item => {
        const existing = map.get(item.phase) || [];
        existing.push(item.team_member_id);
        map.set(item.phase, existing);
      });

      return map;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

// Add a team member to a phase
export function useAddPhaseAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ phase, teamMemberId, workspaceId }: { phase: string; teamMemberId: string; workspaceId: string }) => {
      const { data, error } = await supabase
        .from('phase_automations')
        .insert({ phase, team_member_id: teamMemberId, workspace_id: workspaceId })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('This team member is already assigned to this phase');
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase-automations'] });
      queryClient.invalidateQueries({ queryKey: ['phase-automations-map'] });
      toast.success('Team member added to phase automation');
    },
    onError: (error) => {
      console.error('Failed to add phase automation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add team member');
    },
  });
}

// Remove a team member from a phase
export function useRemovePhaseAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (automationId: string) => {
      const { error } = await supabase
        .from('phase_automations')
        .delete()
        .eq('id', automationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase-automations'] });
      queryClient.invalidateQueries({ queryKey: ['phase-automations-map'] });
      toast.success('Team member removed from phase automation');
    },
    onError: (error) => {
      console.error('Failed to remove phase automation:', error);
      toast.error('Failed to remove team member');
    },
  });
}

// Helper function to fetch phase automations directly (for use in mutations)
export async function fetchPhaseAutomations(workspaceId?: string): Promise<Map<string, string[]>> {
  let query = supabase
    .from('phase_automations')
    .select('phase, team_member_id, workspace_id');

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch phase automations:', error);
    return new Map();
  }

  const map = new Map<string, string[]>();
  data.forEach(item => {
    const existing = map.get(item.phase) || [];
    existing.push(item.team_member_id);
    map.set(item.phase, existing);
  });

  return map;
}
