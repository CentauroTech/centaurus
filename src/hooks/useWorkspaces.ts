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
      const { data, error } = await supabase
        .from('tasks')
        .insert({ group_id: task.group_id, name: task.name || '' })
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
