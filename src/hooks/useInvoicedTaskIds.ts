import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTeamMember } from './useCurrentTeamMember';

/**
 * Returns a Set of completed_task_ids that have already been included
 * in a non-draft invoice (submitted, approved, or paid).
 * These tasks should be blocked from being added to new invoices.
 */
export function useInvoicedTaskIds() {
  const { data: currentMember } = useCurrentTeamMember();

  return useQuery({
    queryKey: ['invoiced-task-ids', currentMember?.id],
    queryFn: async (): Promise<Set<string>> => {
      if (!currentMember?.id) return new Set();

      // Get all invoice_items where the invoice is not draft and belongs to this user
      const { data, error } = await supabase
        .from('invoice_items')
        .select('completed_task_id, invoices!inner(status, team_member_id)')
        .eq('invoices.team_member_id', currentMember.id)
        .not('completed_task_id', 'is', null);

      if (error) throw error;

      const ids = new Set<string>();
      for (const item of data || []) {
        const invoice = item.invoices as any;
        // Block tasks from invoices that are submitted, approved, or paid (not draft)
        if (invoice?.status && invoice.status !== 'draft') {
          if (item.completed_task_id) {
            ids.add(item.completed_task_id);
          }
        }
      }
      return ids;
    },
    enabled: !!currentMember?.id,
  });
}
