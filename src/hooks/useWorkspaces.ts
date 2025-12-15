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

      // For HQ boards, aggregate tasks from ALL boards in the workspace
      if (board.is_hq) {
        // Get all boards in this workspace (except the HQ board itself)
        const { data: workspaceBoards, error: wbError } = await supabase
          .from('boards')
          .select('id, name')
          .eq('workspace_id', board.workspace_id)
          .neq('is_hq', true);

        if (wbError) throw wbError;

        const allBoardIds = workspaceBoards?.map(b => b.id) || [];
        
        // Get all groups from all boards in the workspace
        const { data: allGroups, error: allGroupsError } = await supabase
          .from('task_groups')
          .select('*, boards!inner(name)')
          .in('board_id', allBoardIds)
          .order('sort_order');

        if (allGroupsError) throw allGroupsError;

        const allGroupIds = allGroups?.map(g => g.id) || [];
        
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

        // Create a map of board names for display
        const boardNameMap = new Map(workspaceBoards?.map(b => [b.id, b.name]) || []);

        return {
          ...board,
          teamMemberMap,
          groups: allGroups?.map((g: any) => ({
            ...g,
            name: `${g.boards?.name || 'Unknown'} - ${g.name}`,
            tasks: allTasks.filter((t) => t.group_id === g.id),
          })) || [],
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
