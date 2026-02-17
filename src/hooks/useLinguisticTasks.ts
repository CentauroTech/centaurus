import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, User } from '@/types/board';

interface LinguisticTaskRaw {
  id: string;
  name: string;
  status: string;
  fase: string | null;
  branch: string;
  client_name: string | null;
  work_order_number: string | null;
  translation_due_date: string | null;
  adapting_due_date: string | null;
  last_updated: string | null;
  project_manager_id: string;
  traductor_id: string | null;
  adaptador_id: string | null;
  group_id: string;
  cantidad_episodios: number | null;
}

export interface LinguisticTask {
  id: string;
  name: string;
  status: string;
  phase: string;
  branch: string;
  clientName: string | null;
  workOrderNumber: string | null;
  translationDueDate: string | null;
  adaptingDueDate: string | null;
  phaseDueDate: string | null;
  lastUpdated: Date | null;
  projectManager: User | undefined;
  traductor: User | undefined;
  adaptador: User | undefined;
  traductorId: string | null;
  adaptadorId: string | null;
  groupId: string;
  cantidadEpisodios: number | null;
  // Computed signals
  hasTranslatedFile: boolean;
  hasAdaptedFile: boolean;
  guestSignal: 'none' | 'waiting' | 'replied';
  latestComment: { content: string; authorName: string; createdAt: Date } | null;
}

export function useLinguisticTasks(workspaceId: string | null) {
  return useQuery({
    queryKey: ['linguistic-tasks', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { tasks: [], teamMemberMap: new Map<string, User>() };

      // Get all board IDs in this workspace
      const { data: boards, error: boardsErr } = await supabase
        .from('boards')
        .select('id')
        .eq('workspace_id', workspaceId);
      if (boardsErr) throw boardsErr;
      const boardIds = boards?.map(b => b.id) || [];
      if (boardIds.length === 0) return { tasks: [], teamMemberMap: new Map<string, User>() };

      // Get all group IDs for these boards
      const { data: groups, error: groupsErr } = await supabase
        .from('task_groups')
        .select('id')
        .in('board_id', boardIds);
      if (groupsErr) throw groupsErr;
      const groupIds = groups?.map(g => g.id) || [];
      if (groupIds.length === 0) return { tasks: [], teamMemberMap: new Map<string, User>() };

      // Fetch tasks in translation or adapting phase, not done
      const { data: tasks, error: tasksErr } = await supabase
        .from('tasks')
        .select('id, name, status, fase, branch, client_name, work_order_number, translation_due_date, adapting_due_date, last_updated, project_manager_id, traductor_id, adaptador_id, group_id, cantidad_episodios')
        .in('group_id', groupIds)
        .in('fase', ['translation', 'adapting', 'Translation', 'Adapting'])
        .neq('status', 'done');
      if (tasksErr) throw tasksErr;

      // Fetch team members for lookups
      const { data: members } = await supabase.from('team_members').select('id, name, initials, color');
      const teamMemberMap = new Map<string, User>();
      members?.forEach(m => teamMemberMap.set(m.id, { id: m.id, name: m.name, initials: m.initials, color: m.color }));

      // Fetch file categories for these tasks
      const taskIds = (tasks || []).map(t => t.id);
      let fileMap = new Map<string, Set<string>>();
      if (taskIds.length > 0) {
        const { data: files } = await supabase
          .from('task_files')
          .select('task_id, file_category')
          .in('task_id', taskIds)
          .in('file_category', ['translated', 'adapted']);
        files?.forEach(f => {
          if (!fileMap.has(f.task_id)) fileMap.set(f.task_id, new Set());
          fileMap.get(f.task_id)!.add(f.file_category);
        });
      }

      // Fetch guest signals
      let guestSignalMap = new Map<string, 'none' | 'waiting' | 'replied'>();
      // Fetch latest comment per task
      let latestCommentMap = new Map<string, { content: string; authorName: string; createdAt: Date }>();
      if (taskIds.length > 0) {
        const { data: comments } = await supabase
          .from('comments')
          .select('task_id, is_guest_visible, user_id, created_at, content')
          .in('task_id', taskIds)
          .order('created_at', { ascending: false });

        // Build guest signal and latest comment per task
        const taskComments = new Map<string, typeof comments>();
        comments?.forEach(c => {
          if (!taskComments.has(c.task_id)) taskComments.set(c.task_id, []);
          taskComments.get(c.task_id)!.push(c);
        });

        // Get guest member IDs
        const { data: guestMembers } = await supabase
          .from('team_members')
          .select('id')
          .eq('role', 'guest');
        const guestIds = new Set(guestMembers?.map(g => g.id) || []);

        taskComments.forEach((cmts, taskId) => {
          // Latest comment (first in array since ordered desc)
          if (cmts.length > 0) {
            const latest = cmts[0];
            const author = teamMemberMap.get(latest.user_id);
            latestCommentMap.set(taskId, {
              content: latest.content,
              authorName: author?.name || 'Unknown',
              createdAt: new Date(latest.created_at),
            });
          }

          // Guest signal from guest-visible comments only
          const guestVisibleCmts = cmts.filter(c => c.is_guest_visible);
          if (guestVisibleCmts.length === 0) {
            guestSignalMap.set(taskId, 'none');
            return;
          }
          const latestGuestVisible = guestVisibleCmts[0];
          if (guestIds.has(latestGuestVisible.user_id)) {
            guestSignalMap.set(taskId, 'replied');
          } else {
            guestSignalMap.set(taskId, 'waiting');
          }
        });
      }

      const linguisticTasks: LinguisticTask[] = (tasks || []).map(t => {
        const phase = (t.fase || 'translation').toLowerCase();
        const fileCats = fileMap.get(t.id) || new Set();
        return {
          id: t.id,
          name: t.name,
          status: t.status,
          phase,
          branch: t.branch,
          clientName: t.client_name,
          workOrderNumber: t.work_order_number,
          translationDueDate: t.translation_due_date,
          adaptingDueDate: t.adapting_due_date,
          phaseDueDate: phase === 'translation' ? t.translation_due_date : t.adapting_due_date,
          lastUpdated: t.last_updated ? new Date(t.last_updated) : null,
          projectManager: teamMemberMap.get(t.project_manager_id),
          traductor: t.traductor_id ? teamMemberMap.get(t.traductor_id) : undefined,
          adaptador: t.adaptador_id ? teamMemberMap.get(t.adaptador_id) : undefined,
          traductorId: t.traductor_id,
          adaptadorId: t.adaptador_id,
          groupId: t.group_id,
          cantidadEpisodios: t.cantidad_episodios,
          hasTranslatedFile: fileCats.has('translated'),
          hasAdaptedFile: fileCats.has('adapted'),
          guestSignal: guestSignalMap.get(t.id) || 'none',
          latestComment: latestCommentMap.get(t.id) || null,
        };
      });

      return { tasks: linguisticTasks, teamMemberMap };
    },
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });
}