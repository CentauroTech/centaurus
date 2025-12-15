import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: string;
  workspace_id: string;
  name: string;
  is_hq: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceWithBoards extends Workspace {
  boards: Board[];
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async (): Promise<WorkspaceWithBoards[]> => {
      const { data: workspaces, error: wsError } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at');

      if (wsError) throw wsError;

      const { data: boards, error: boardsError } = await supabase
        .from('boards')
        .select('*')
        .order('sort_order');

      if (boardsError) throw boardsError;

      return workspaces.map((ws) => ({
        ...ws,
        boards: boards.filter((b) => b.workspace_id === ws.id),
      }));
    },
    staleTime: 60000, // Cache for 1 minute
  });
}

export function useBoard(boardId: string | null) {
  return useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => {
      if (!boardId) return null;

      const { data: board, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .maybeSingle();

      if (boardError) throw boardError;
      if (!board) return null;

      // Fetch team members to map person fields
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('*');
      
      if (teamError) throw teamError;

      const teamMemberMap = new Map(teamMembers?.map(m => [m.id, {
        id: m.id,
        name: m.name,
        initials: m.initials,
        color: m.color,
        email: m.email,
      }]) || []);

      // For HQ boards, aggregate tasks from ALL boards in the workspace, grouped by phase
      if (board.is_hq) {
        // Get all boards in this workspace (except the HQ board itself)
        const { data: workspaceBoards, error: wbError } = await supabase
          .from('boards')
          .select('id, name')
          .eq('workspace_id', board.workspace_id)
          .neq('is_hq', true);

        if (wbError) throw wbError;

        const allBoardIds = workspaceBoards?.map(b => b.id) || [];
        
        // Create a map of board_id to board name for phase extraction
        const boardMap = new Map(workspaceBoards?.map(b => [b.id, b.name]) || []);
        
        // Get all groups from all boards in the workspace
        const { data: allGroups, error: allGroupsError } = await supabase
          .from('task_groups')
          .select('*')
          .in('board_id', allBoardIds)
          .order('sort_order');

        if (allGroupsError) throw allGroupsError;

        const allGroupIds = allGroups?.map(g => g.id) || [];
        
        // Create a map of group_id to board_id
        const groupToBoardMap = new Map(allGroups?.map(g => [g.id, g.board_id]) || []);
        
        let allTasks: any[] = [];
        if (allGroupIds.length > 0) {
          const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .in('group_id', allGroupIds)
            .order('sort_order');

          if (tasksError) throw tasksError;
          allTasks = tasksData || [];
        }

        // Extract phase from board name (e.g., "Col-Kickoff" -> "Kickoff", "Mia-Recording" -> "Recording")
        const extractPhase = (boardName: string): string => {
          const parts = boardName.split('-');
          return parts.length > 1 ? parts.slice(1).join('-') : boardName;
        };

        // Add currentPhase to each task based on its board
        const tasksWithPhase = allTasks.map(t => {
          const boardId = groupToBoardMap.get(t.group_id);
          const boardName = boardId ? boardMap.get(boardId) : 'Unknown';
          return {
            ...t,
            currentPhase: extractPhase(boardName || 'Unknown'),
          };
        });

        // Group tasks by phase
        const phaseGroups = new Map<string, any[]>();
        tasksWithPhase.forEach(t => {
          const phase = t.currentPhase;
          if (!phaseGroups.has(phase)) {
            phaseGroups.set(phase, []);
          }
          phaseGroups.get(phase)!.push(t);
        });

        // Define phase order based on workflow
        const phaseOrder = [
          'Kickoff', 'Materiales', 'Assets', 'Client Retakes',
          'Traducción + Ad', 'Translation', 'Adaptación', 'Adapting',
          'Desglose', 'Casting', 'VoiceTests', 'Programación',
          'Grabación', 'Recording', 'Premix', 'QC Premix', 'QC 1',
          'Retakes', 'Mix Bogotá', 'Mix', 'Qc Mix', 'Mix Retakes', 'MixRetakes',
          'Deliveries', 'Entregados'
        ];

        // Sort phases and create virtual groups
        const sortedPhases = Array.from(phaseGroups.keys()).sort((a, b) => {
          const indexA = phaseOrder.indexOf(a);
          const indexB = phaseOrder.indexOf(b);
          if (indexA === -1 && indexB === -1) return a.localeCompare(b);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });

        // Create a color for each phase
        const phaseColors: Record<string, string> = {
          'Kickoff': 'hsl(209, 100%, 46%)',
          'Materiales': 'hsl(25, 95%, 53%)',
          'Assets': 'hsl(25, 95%, 53%)',
          'Translation': 'hsl(270, 50%, 60%)',
          'Traducción + Ad': 'hsl(270, 50%, 60%)',
          'Adapting': 'hsl(280, 50%, 55%)',
          'Adaptación': 'hsl(280, 50%, 55%)',
          'Recording': 'hsl(154, 64%, 45%)',
          'Grabación': 'hsl(154, 64%, 45%)',
          'Premix': 'hsl(180, 60%, 45%)',
          'Mix': 'hsl(200, 70%, 50%)',
          'Mix Bogotá': 'hsl(200, 70%, 50%)',
          'QC 1': 'hsl(45, 90%, 50%)',
          'Qc Mix': 'hsl(45, 90%, 50%)',
          'Retakes': 'hsl(0, 72%, 51%)',
          'Deliveries': 'hsl(120, 60%, 45%)',
          'Entregados': 'hsl(120, 60%, 45%)',
        };

        const virtualGroups = sortedPhases.map((phase, index) => ({
          id: `hq-phase-${phase}`,
          board_id: board.id,
          name: phase,
          color: phaseColors[phase] || 'hsl(209, 100%, 46%)',
          is_collapsed: false,
          sort_order: index,
          tasks: phaseGroups.get(phase) || [],
          isVirtual: true, // Mark as virtual group (read-only in HQ)
        }));

        return {
          ...board,
          teamMemberMap,
          groups: virtualGroups,
          isHqView: true,
        };
      }

      // Regular board - fetch only its own groups and tasks
      const { data: groups, error: groupsError } = await supabase
        .from('task_groups')
        .select('*')
        .eq('board_id', boardId)
        .order('sort_order');

      if (groupsError) throw groupsError;

      const groupIds = groups.map((g) => g.id);
      
      let tasks: any[] = [];
      if (groupIds.length > 0) {
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .in('group_id', groupIds)
          .order('sort_order');

        if (tasksError) throw tasksError;
        tasks = tasksData || [];
      }

      return {
        ...board,
        teamMemberMap,
        groups: groups.map((g) => ({
          ...g,
          tasks: tasks.filter((t) => t.group_id === g.id),
        })),
      };
    },
    enabled: !!boardId,
    staleTime: 10000, // Cache for 10 seconds
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team_members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
    staleTime: 120000, // Cache for 2 minutes - team members rarely change
  });
}

export function useAddTaskGroup(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (group: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from('task_groups')
        .insert({ board_id: boardId, name: group.name, color: group.color })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}

export function useUpdateTaskGroup(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, updates }: { groupId: string; updates: Partial<{ name: string; color: string; is_collapsed: boolean }> }) => {
      const { data, error } = await supabase
        .from('task_groups')
        .update(updates)
        .eq('id', groupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}

export function useAddTask(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: { group_id: string; name?: string }) => {
      // Generate a work order number: WO-YYYYMMDD-XXXX
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const workOrderNumber = `WO-${dateStr}-${randomPart}`;

      const { data, error } = await supabase
        .from('tasks')
        .insert({ 
          group_id: task.group_id, 
          name: task.name || '',
          work_order_number: workOrderNumber,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}

export function useUpdateTask(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Record<string, any> }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...updates, last_updated: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}

export function useDeleteTask(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}
