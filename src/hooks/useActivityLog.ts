import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityLogEntry {
  id: string;
  task_id: string;
  type: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  context_board: string | null;
  context_phase: string | null;
  user_id: string | null;
  created_at: string;
  user: {
    id: string;
    name: string;
    initials: string;
    color: string;
  } | null;
}

export function useActivityLog(taskId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['activity-log', taskId],
    queryFn: async () => {
      // Fetch activity log entries for the task
      const { data: logs, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user details for each unique user_id
      const userIds = [...new Set(logs?.filter(l => l.user_id).map(l => l.user_id))];
      
      let usersMap = new Map<string, { id: string; name: string; initials: string; color: string }>();
      
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('team_members')
          .select('id, name, initials, color')
          .in('id', userIds);
        
        users?.forEach(u => usersMap.set(u.id, u));
      }

      // Map logs with user data
      return logs?.map(log => ({
        ...log,
        context_board: (log as any).context_board || null,
        context_phase: (log as any).context_phase || null,
        user: log.user_id ? usersMap.get(log.user_id) || null : null,
      })) as ActivityLogEntry[] || [];
    },
    enabled: enabled && !!taskId,
  });
}
