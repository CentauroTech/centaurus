import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types/board';

// QC-relevant phases
export const QC_PHASES = ['qc_premix', 'qc_retakes', 'mix', 'qc_mix', 'mix_retakes'] as const;
export type QCPhase = typeof QC_PHASES[number];

export const QC_PHASE_LABELS: Record<string, string> = {
  qc_premix: 'QC Premix',
  qc_retakes: 'QC Retakes',
  mix: 'Mix',
  qc_mix: 'QC Mix',
  mix_retakes: 'Mix Retakes',
};

// Maps phases to board name suffixes (case-insensitive matching)
const PHASE_TO_BOARD_SUFFIX: Record<string, string[]> = {
  qc_premix: ['qc premix', 'qc-premix', 'qcpremix'],
  qc_retakes: ['qc retakes', 'qc-retakes', 'qcretakes'],
  mix: ['mix'],
  qc_mix: ['qc-mix', 'qc mix', 'qcmix'],
  mix_retakes: ['mixretakes', 'mix retakes', 'mix-retakes'],
};

// Maps QC phase to the due date field in the tasks table
export const QC_PHASE_DUE_DATE_FIELD: Record<string, string> = {
  qc_premix: 'qc_premix_due_date',
  qc_retakes: 'qc_retakes_due_date',
  mix: 'mix_due_date',
  qc_mix: 'qc_mix_due_date',
  mix_retakes: 'mix_retakes_due_date',
};

// Maps QC phase to the assignee column
export const QC_PHASE_ASSIGNEE_FIELD: Record<string, string> = {
  qc_premix: 'qc_1_id',
  qc_retakes: 'qc_retakes_id',
  mix: 'mixer_miami_id',
  qc_mix: 'qc_mix_id',
  mix_retakes: 'mixer_miami_id',
};

export interface QCTask {
  id: string;
  name: string;
  status: string;
  phase: string;
  branch: string;
  clientName: string | null;
  workOrderNumber: string | null;
  phaseDueDate: string | null;
  lastUpdated: Date | null;
  projectManager: User | undefined;
  assignee: User | undefined;
  assigneeId: string | null;
  groupId: string;
  cantidadEpisodios: number | null;
  // Submission signals
  submissionStatus: 'ready' | 'missing' | 'waiting' | 'blocked';
  hasRetakeList: boolean;
  hasFileUpload: boolean;
  // Vendor activity
  latestComment: { content: string; authorName: string; createdAt: Date; isVendor: boolean } | null;
  latestVendorComment: { content: string; authorName: string; createdAt: Date } | null;
  lastVendorActivity: Date | null;
  guestSignal: 'none' | 'waiting' | 'replied';
  // All QC date fields for calendar
  qcPremixDueDate: string | null;
  qcRetakesDueDate: string | null;
  mixDueDate: string | null;
  qcMixDueDate: string | null;
  mixRetakesDueDate: string | null;
  entregaMiamiEnd: string | null;
  entregaCliente: string | null;
  // Raw IDs for task construction
  projectManagerId: string;
  qc1Id: string | null;
  qcRetakesId: string | null;
  qcMixId: string | null;
  mixerMiamiId: string | null;
  mixerBogotaId: string | null;
}

function normalizePhaseName(boardName: string): string | null {
  const phasePart = boardName.includes('-') 
    ? boardName.substring(boardName.indexOf('-') + 1).trim()
    : boardName.trim();
  const normalized = phasePart.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const [phase, suffixes] of Object.entries(PHASE_TO_BOARD_SUFFIX)) {
    for (const suffix of suffixes) {
      if (normalized === suffix.replace(/[^a-z0-9]/g, '')) {
        return phase;
      }
    }
  }
  return null;
}

export function useQCTasks(workspaceIds: string[]) {
  return useQuery({
    queryKey: ['qc-tasks', workspaceIds],
    queryFn: async () => {
      if (workspaceIds.length === 0) return { tasks: [], teamMemberMap: new Map<string, User>() };

      // Get boards in these workspaces
      const { data: boards, error: boardsErr } = await supabase
        .from('boards')
        .select('id, name, workspace_id')
        .in('workspace_id', workspaceIds)
        .eq('is_hq', false);
      if (boardsErr) throw boardsErr;

      // Filter to QC-relevant boards
      const qcBoards = (boards || []).filter(b => normalizePhaseName(b.name) !== null);
      if (qcBoards.length === 0) return { tasks: [], teamMemberMap: new Map<string, User>() };

      const boardPhaseMap = new Map<string, string>();
      const boardWorkspaceMap = new Map<string, string>();
      qcBoards.forEach(b => {
        const phase = normalizePhaseName(b.name);
        if (phase) boardPhaseMap.set(b.id, phase);
        boardWorkspaceMap.set(b.id, b.workspace_id);
      });

      // Get groups for these boards
      const { data: groups, error: groupsErr } = await supabase
        .from('task_groups')
        .select('id, board_id')
        .in('board_id', qcBoards.map(b => b.id));
      if (groupsErr) throw groupsErr;
      
      const groupBoardMap = new Map<string, string>();
      (groups || []).forEach(g => groupBoardMap.set(g.id, g.board_id));
      const groupIds = (groups || []).map(g => g.id);
      if (groupIds.length === 0) return { tasks: [], teamMemberMap: new Map<string, User>() };

      // Fetch tasks that are not done
      const { data: tasks, error: tasksErr } = await supabase
        .from('tasks')
        .select('id, name, status, fase, branch, client_name, work_order_number, last_updated, project_manager_id, qc_1_id, qc_retakes_id, qc_mix_id, mixer_miami_id, mixer_bogota_id, group_id, cantidad_episodios, qc_premix_due_date, qc_retakes_due_date, mix_due_date, qc_mix_due_date, mix_retakes_due_date, premix_due_date, retakes_due_date, entrega_miami_end, entrega_cliente')
        .in('group_id', groupIds)
        .neq('status', 'done');
      if (tasksErr) throw tasksErr;

      // Fetch team members
      const { data: members } = await supabase.from('team_members').select('id, name, initials, color, role');
      const teamMemberMap = new Map<string, User>();
      const guestIds = new Set<string>();
      members?.forEach(m => {
        teamMemberMap.set(m.id, { id: m.id, name: m.name, initials: m.initials, color: m.color });
        if (m.role === 'guest') guestIds.add(m.id);
      });

      // Fetch comments for vendor activity and submission detection
      const taskIds = (tasks || []).map(t => t.id);
      let commentMap = new Map<string, { content: string; authorName: string; createdAt: Date; isVendor: boolean }>();
      let lastVendorActivityMap = new Map<string, Date>();
      let guestSignalMap = new Map<string, 'none' | 'waiting' | 'replied'>();
      let hasRetakeListMap = new Map<string, boolean>();
      let vendorCommentMap = new Map<string, { content: string; authorName: string; createdAt: Date }>();

      if (taskIds.length > 0) {
        const { data: comments } = await supabase
          .from('comments')
          .select('task_id, user_id, content, created_at, is_guest_visible')
          .in('task_id', taskIds)
          .order('created_at', { ascending: false });

        const taskComments = new Map<string, typeof comments>();
        comments?.forEach(c => {
          if (!taskComments.has(c.task_id)) taskComments.set(c.task_id, []);
          taskComments.get(c.task_id)!.push(c);
        });

        taskComments.forEach((cmts, taskId) => {
          // Latest comment
          if (cmts.length > 0) {
            const latest = cmts[0];
            const author = teamMemberMap.get(latest.user_id);
            const isVendor = guestIds.has(latest.user_id);
            commentMap.set(taskId, {
              content: latest.content,
              authorName: author?.name || 'Unknown',
              createdAt: new Date(latest.created_at),
              isVendor,
            });
          }

          // Last vendor activity
          const vendorComments = cmts.filter(c => guestIds.has(c.user_id));
          if (vendorComments.length > 0) {
            lastVendorActivityMap.set(taskId, new Date(vendorComments[0].created_at));
            const vendorAuthor = teamMemberMap.get(vendorComments[0].user_id);
            vendorCommentMap.set(taskId, {
              content: vendorComments[0].content,
              authorName: vendorAuthor?.name || 'Unknown',
              createdAt: new Date(vendorComments[0].created_at),
            });
          }

          // Guest signal
          const guestVisibleCmts = cmts.filter(c => c.is_guest_visible);
          if (guestVisibleCmts.length === 0) {
            guestSignalMap.set(taskId, 'none');
          } else if (guestIds.has(guestVisibleCmts[0].user_id)) {
            guestSignalMap.set(taskId, 'replied');
          } else {
            guestSignalMap.set(taskId, 'waiting');
          }

          // Check for retake list in comments
          const hasRetake = cmts.some(c => 
            c.content.toLowerCase().includes('retake list') ||
            c.content.includes('data-submission="retake_list"')
          );
          hasRetakeListMap.set(taskId, hasRetake);
        });
      }

      // Check for file uploads per task
      let hasFileMap = new Map<string, boolean>();
      if (taskIds.length > 0) {
        const { data: files } = await supabase
          .from('task_files')
          .select('task_id')
          .in('task_id', taskIds)
          .in('file_category', ['delivery', 'translated', 'adapted', 'general']);
        const fileTaskIds = new Set(files?.map(f => f.task_id) || []);
        taskIds.forEach(id => hasFileMap.set(id, fileTaskIds.has(id)));
      }

      // Get workspace names for branch mapping
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id, name')
        .in('id', workspaceIds);
      const workspaceNameMap = new Map<string, string>();
      workspaces?.forEach(w => workspaceNameMap.set(w.id, w.name));

      const qcTasks: QCTask[] = (tasks || []).map(t => {
        const boardId = groupBoardMap.get(t.group_id);
        const phase = boardId ? boardPhaseMap.get(boardId) || 'unknown' : 'unknown';
        const wsId = boardId ? boardWorkspaceMap.get(boardId) : undefined;
        
        // Get the phase-specific due date
        const dueDateField = QC_PHASE_DUE_DATE_FIELD[phase];
        const phaseDueDate = dueDateField ? (t as any)[dueDateField] : null;
        
        // Get assignee based on phase
        const assigneeField = QC_PHASE_ASSIGNEE_FIELD[phase];
        const assigneeId = assigneeField ? (t as any)[assigneeField] : null;

        // Determine submission status
        const hasRetake = hasRetakeListMap.get(t.id) || false;
        const hasFile = hasFileMap.get(t.id) || false;
        const isQCPhase = ['qc_premix', 'qc_retakes', 'qc_mix'].includes(phase);
        
        let submissionStatus: 'ready' | 'missing' | 'waiting' | 'blocked' = 'missing';
        if (hasRetake || hasFile) {
          submissionStatus = 'ready';
        } else if (phase === 'qc_retakes') {
          submissionStatus = 'blocked';
        } else if (guestSignalMap.get(t.id) === 'waiting') {
          submissionStatus = 'waiting';
        }

        return {
          id: t.id,
          name: t.name,
          status: t.status,
          phase,
          branch: t.branch,
          clientName: t.client_name,
          workOrderNumber: t.work_order_number,
          phaseDueDate,
          lastUpdated: t.last_updated ? new Date(t.last_updated) : null,
          projectManager: teamMemberMap.get(t.project_manager_id),
          assignee: assigneeId ? teamMemberMap.get(assigneeId) : undefined,
          assigneeId,
          groupId: t.group_id,
          cantidadEpisodios: t.cantidad_episodios,
          submissionStatus,
          hasRetakeList: hasRetake,
          hasFileUpload: hasFile,
          latestComment: commentMap.get(t.id) || null,
          latestVendorComment: vendorCommentMap.get(t.id) || null,
          lastVendorActivity: lastVendorActivityMap.get(t.id) || null,
          guestSignal: guestSignalMap.get(t.id) || 'none',
          // All QC date fields for calendar
          qcPremixDueDate: t.qc_premix_due_date,
          qcRetakesDueDate: t.qc_retakes_due_date,
          mixDueDate: t.mix_due_date,
          qcMixDueDate: t.qc_mix_due_date,
          mixRetakesDueDate: t.mix_retakes_due_date,
          entregaMiamiEnd: t.entrega_miami_end,
          entregaCliente: t.entrega_cliente,
          projectManagerId: t.project_manager_id,
          qc1Id: t.qc_1_id,
          qcRetakesId: t.qc_retakes_id,
          qcMixId: t.qc_mix_id,
          mixerMiamiId: t.mixer_miami_id,
          mixerBogotaId: t.mixer_bogota_id,
        };
      });

      return { tasks: qcTasks, teamMemberMap };
    },
    enabled: workspaceIds.length > 0,
    refetchInterval: 30000,
  });
}
