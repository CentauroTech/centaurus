import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { TaskTemplate } from '@/components/board/MultipleWODialog';

interface CreateMultipleTasksParams {
  groupId: string;
  template: TaskTemplate;
  names: string[];
}

export function useAddMultipleTasks(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, template, names }: CreateMultipleTasksParams) => {
      // Get the max sort_order for existing tasks in this group
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('sort_order')
        .eq('group_id', groupId)
        .order('sort_order', { ascending: false })
        .limit(1);

      let nextSortOrder = (existingTasks?.[0]?.sort_order ?? -1) + 1;
      
      // Create tasks with sequential names
      // The database trigger will auto-generate work_order_number based on branch + PM + date
      const tasksToInsert = names.map((name, index) => ({
        group_id: groupId,
        name: name,
        status: 'working',
        sort_order: nextSortOrder + index,
        // Required fields - the trigger will generate WO# from these
        branch: template.branch,
        project_manager_id: template.project_manager_id,
        studio_assigned: template.studio_assigned || null,
        // Optional fields from template
        client_name: template.client_name || null,
        servicios: template.servicios || null,
        formato: template.formato || null,
        cantidad_episodios: template.cantidad_episodios || null,
        genre: template.genre || null,
        lenguaje_original: template.lenguaje_original || null,
        target_language: template.target_language || null,
        prueba_de_voz: template.prueba_de_voz || null,
        locked_runtime: template.locked_runtime || null,
        final_runtime: template.final_runtime || null,
        show_guide: template.show_guide || null,
        titulo_aprobado_espanol: template.titulo_aprobado_espanol || null,
        rate_info: template.rate_info || null,
        rates: template.rates || null,
        studio: template.studio || null,
        aor_needed: template.aor_needed ?? null,
        entrega_final_script_items: template.entrega_final_script_items || null,
        entrega_final_dub_audio_items: template.entrega_final_dub_audio_items || null,
        // Delivery dates
        entrega_cliente: template.entrega_cliente || null,
        entrega_miami_start: template.entrega_miami_start || null,
        entrega_miami_end: template.entrega_miami_end || null,
        entrega_sesiones: template.entrega_sesiones || null,
        entrega_mix_retakes: template.entrega_mix_retakes || null,
        entrega_final_script: template.entrega_final_script || null,
        entrega_final_dub_audio: template.entrega_final_dub_audio || null,
      }));

      const { data, error } = await supabase
        .from('tasks')
        .insert(tasksToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}

// Helper function to generate sequential names
export function generateSequentialNames(
  baseName: string,
  startingSuffix: string,
  count: number
): string[] {
  const names: string[] = [];
  
  // Check if suffix is purely numeric
  const numericMatch = startingSuffix.match(/^(\d+)$/);
  // Check if suffix has a prefix and number (e.g., "B1", "EP01")
  const prefixedMatch = startingSuffix.match(/^([A-Za-z]+)(\d+)$/);
  
  if (numericMatch) {
    // Pure number: 1, 2, 3 or 100, 101, 102
    const startNum = parseInt(numericMatch[1], 10);
    const padLength = numericMatch[1].length;
    
    for (let i = 0; i < count; i++) {
      const num = startNum + i;
      const paddedNum = String(num).padStart(padLength, '0');
      names.push(`${baseName} ${paddedNum}`);
    }
  } else if (prefixedMatch) {
    // Prefix + number: B1, B2, B3 or EP01, EP02
    const prefix = prefixedMatch[1];
    const startNum = parseInt(prefixedMatch[2], 10);
    const padLength = prefixedMatch[2].length;
    
    for (let i = 0; i < count; i++) {
      const num = startNum + i;
      const paddedNum = String(num).padStart(padLength, '0');
      names.push(`${baseName} ${prefix}${paddedNum}`);
    }
  } else {
    // Fallback: just append index
    for (let i = 0; i < count; i++) {
      names.push(`${baseName} ${i + 1}`);
    }
  }
  
  return names;
}
