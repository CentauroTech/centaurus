import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { TaskTemplate, PendingFile } from '@/components/board/MultipleWODialog';

interface CreateMultipleTasksParams {
  groupId: string;
  template: TaskTemplate;
  names: string[];
  branches: string[]; // Now supports multiple branches
}

// Map branch name to workspace name prefix
const BRANCH_TO_WORKSPACE_PREFIX: Record<string, string> = {
  'Miami': 'Miami',
  'Colombia': 'Colombia', 
  'Brazil': 'Estudios Externos',
  'Mexico': 'Estudios Externos'
};

// Generate branch code prefix for WO# (e.g., "MC" for Miami+Colombia)
function generateBranchPrefix(branches: string[]): string {
  // Sort branches alphabetically for consistent prefix
  const sortedBranches = [...branches].sort();
  return sortedBranches.map(b => b.charAt(0).toUpperCase()).join('');
}

export function useAddMultipleTasks(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['addMultipleTasks', boardId],
    mutationFn: async ({ groupId, template, names, branches }: CreateMultipleTasksParams) => {
      // Generate branch prefix for multi-branch WO#
      const branchPrefix = branches.length > 1 ? generateBranchPrefix(branches) : '';
      
      // Get workspace info for each branch
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select(`
          id,
          name,
          boards (
            id,
            name,
            task_groups (
              id,
              name,
              sort_order
            )
          )
        `)
        .eq('is_system_workspace', false);

      if (!workspaces) throw new Error('Failed to fetch workspaces');

      const allCreatedTasks: any[] = [];

      // For each selected branch, create tasks in the appropriate workspace
      for (const branch of branches) {
        const workspacePrefix = BRANCH_TO_WORKSPACE_PREFIX[branch];
        if (!workspacePrefix) continue;

        // Find the workspace
        const workspace = workspaces.find(w => 
          w.name.toLowerCase().includes(workspacePrefix.toLowerCase())
        );
        if (!workspace) continue;

        // Find the Kickoff board in this workspace
        const kickoffBoard = (workspace.boards as any[])?.find(b => 
          b.name.toLowerCase().includes('kickoff')
        );
        if (!kickoffBoard) continue;

        // Get the first task group in the kickoff board
        const targetGroup = (kickoffBoard.task_groups as any[])?.sort(
          (a: any, b: any) => a.sort_order - b.sort_order
        )[0];
        if (!targetGroup) continue;

        // Get the max sort_order for existing tasks in this group
        const { data: existingTasks } = await supabase
          .from('tasks')
          .select('sort_order')
          .eq('group_id', targetGroup.id)
          .order('sort_order', { ascending: false })
          .limit(1);

        let nextSortOrder = (existingTasks?.[0]?.sort_order ?? -1) + 1;
        
        // Create tasks with sequential names
        // We'll set work_order_number to null and let the trigger generate it,
        // but we'll update it with the branch prefix afterward if multi-branch
        const tasksToInsert = names.map((name, index) => ({
          group_id: targetGroup.id,
          name: name,
          status: 'working',
          sort_order: nextSortOrder + index,
          // Required fields - the trigger will generate WO# from these
          branch: branch,
          project_manager_id: template.project_manager_id,
          studio_assigned: template.studio_assigned || null,
          // Store all branches in the task for display purposes
          // (Since branch column is text, we store the display string)
          // Optional fields from template
          client_name: template.client_name || null,
          servicios: template.servicios || null,
          formato: template.formato || null,
          cantidad_episodios: template.cantidad_episodios || null,
          genre: template.genre || null,
          lenguaje_original: template.lenguaje_original || null,
          target_language: Array.isArray(template.target_language) ? template.target_language.join(', ') : (template.target_language || null),
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
          kickoff_brief: template.kickoff_brief || null,
          abbreviation: template.abbreviation || null,
          // Delivery dates
          entrega_cliente: template.entrega_cliente || null,
          entrega_miami_start: template.entrega_miami_start || null,
          entrega_miami_end: template.entrega_miami_end || null,
          entrega_sesiones: template.entrega_sesiones || null,
          entrega_mix_retakes: template.entrega_mix_retakes || null,
          entrega_final_script: template.entrega_final_script || null,
          entrega_final_dub_audio: template.entrega_final_dub_audio || null,
          // Phase due dates
          assets_due_date: template.assets_due_date || null,
          translation_due_date: template.translation_due_date || null,
          adapting_due_date: template.adapting_due_date || null,
          voice_tests_due_date: template.voice_tests_due_date || null,
          recording_due_date: template.recording_due_date || null,
          premix_due_date: template.premix_due_date || null,
          qc_premix_due_date: template.qc_premix_due_date || null,
          retakes_due_date: template.retakes_due_date || null,
          qc_retakes_due_date: template.qc_retakes_due_date || null,
          mix_due_date: template.mix_due_date || null,
          qc_mix_due_date: template.qc_mix_due_date || null,
          mix_retakes_due_date: template.mix_retakes_due_date || null,
        }));

        const { data, error } = await supabase
          .from('tasks')
          .insert(tasksToInsert)
          .select();

        if (error) throw error;
        
        // If multi-branch, update the WO# to include the branch prefix
        if (data && branches.length > 1) {
          for (const task of data) {
            if (task.work_order_number) {
              // Prepend the branch prefix to existing WO#
              // Current format: BranchCode+PM+Date+Seq (e.g., MJM01172601)
              // New format: MultiBranchPrefix+PM+Date+Seq (e.g., MCJM01172601)
              const currentWO = task.work_order_number;
              // Replace the first character (single branch code) with multi-branch prefix
              const newWO = branchPrefix + currentWO.slice(1);
              
              await supabase
                .from('tasks')
                .update({ work_order_number: newWO })
                .eq('id', task.id);
              
              task.work_order_number = newWO;
            }
          }
        }
        
        if (data) allCreatedTasks.push(...data);
      }

      // Upload pending files to all created tasks
      if (template.pendingFiles && template.pendingFiles.length > 0 && allCreatedTasks.length > 0) {
        const currentMemberId = (await supabase.rpc('current_team_member_id')).data;
        
        for (const pendingFile of template.pendingFiles) {
          for (const task of allCreatedTasks) {
            try {
              const fileExt = pendingFile.file.name.split('.').pop();
              const fileName = `${task.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

              const { error: uploadError } = await supabase.storage
                .from('production-files')
                .upload(fileName, pendingFile.file);

              if (uploadError) {
                console.error('File upload error:', uploadError);
                continue;
              }

              const { data: urlData } = supabase.storage
                .from('production-files')
                .getPublicUrl(fileName);

              await supabase
                .from('task_files')
                .insert({
                  task_id: task.id,
                  name: pendingFile.file.name,
                  url: urlData.publicUrl,
                  type: pendingFile.file.type.startsWith('image/') ? 'image' :
                        pendingFile.file.type.startsWith('audio/') ? 'audio' :
                        pendingFile.file.type.startsWith('video/') ? 'video' :
                        pendingFile.file.type.includes('pdf') || pendingFile.file.type.includes('document') ? 'document' : 'other',
                  size: pendingFile.file.size,
                  file_category: pendingFile.category,
                  uploaded_by_id: currentMemberId,
                });
            } catch (err) {
              console.error('Failed to upload file to task:', task.id, err);
            }
          }
        }

        toast.success(`${template.pendingFiles.length} file(s) uploaded to ${allCreatedTasks.length} task(s)`);
      }

      return allCreatedTasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['task-files'] });
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
