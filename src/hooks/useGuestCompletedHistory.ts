import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTeamMember } from './useCurrentTeamMember';

export interface GuestCompletedTask {
  id: string;
  taskId: string;
  phase: string;
  rolePerformed: string;
  completedAt: string;
  deliveryComment?: string;
  workOrderNumber?: string;
  taskName: string;
  tituloAprobadoEspanol?: string;
  lockedRuntime?: string;
  cantidadEpisodios?: number;
  workspaceName?: string;
}

export function useGuestCompletedHistory() {
  const { data: currentMember } = useCurrentTeamMember();

  return useQuery({
    queryKey: ['guest-completed-history', currentMember?.id],
    queryFn: async (): Promise<GuestCompletedTask[]> => {
      if (!currentMember?.id) return [];

      const { data, error } = await supabase
        .from('guest_completed_tasks')
        .select('*')
        .eq('team_member_id', currentMember.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(record => ({
        id: record.id,
        taskId: record.task_id,
        phase: record.phase,
        rolePerformed: record.role_performed,
        completedAt: record.completed_at,
        deliveryComment: record.delivery_comment,
        workOrderNumber: record.work_order_number,
        taskName: record.task_name,
        tituloAprobadoEspanol: record.titulo_aprobado_espanol,
        lockedRuntime: record.locked_runtime,
        cantidadEpisodios: record.cantidad_episodios,
        workspaceName: record.workspace_name,
      }));
    },
    enabled: !!currentMember?.id,
  });
}
