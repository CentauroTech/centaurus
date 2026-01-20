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

      // Fetch workspace name
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', board.workspace_id)
        .maybeSingle();
      
      if (wsError) throw wsError;
      const workspaceName = workspace?.name || '';

      // For HQ boards, use optimized database function
      if (board.is_hq) {
        const { data: hqData, error: hqError } = await supabase
          .rpc('get_hq_board_data', { board_id_param: boardId }) as { data: any; error: any };

        if (hqError) throw hqError;
        if (!hqData) return null;

        // Build team member map from the response
        const teamMemberMap = new Map<string, any>(
          (hqData.team_members || []).map((m: any) => [m.id, m])
        );

        // Build task people map
        const taskPeopleMap = new Map<string, any[]>();
        (hqData.task_people || []).forEach((tp: any) => {
          const member = teamMemberMap.get(tp.team_member_id);
          if (member) {
            const existing = taskPeopleMap.get(tp.task_id) || [];
            existing.push(member);
            taskPeopleMap.set(tp.task_id, existing);
          }
        });

        // Build task viewers map
        const taskViewersMap = new Map<string, string[]>();
        (hqData.task_viewers || []).forEach((tv: any) => {
          const existing = taskViewersMap.get(tv.task_id) || [];
          existing.push(tv.team_member_id);
          taskViewersMap.set(tv.task_id, existing);
        });

        // Transform tasks with people data
        const tasksWithPeople = (hqData.tasks || []).map((t: any) => ({
          ...t,
          people: taskPeopleMap.get(t.id) || [],
        }));

        // Group all tasks into one "Projects in Production" group
        const virtualGroups = [{
          id: `hq-all-projects`,
          board_id: board.id,
          name: 'Projects in Production',
          color: 'hsl(209, 100%, 46%)',
          is_collapsed: false,
          sort_order: 0,
          tasks: tasksWithPeople,
          isVirtual: true,
        }];

        return {
          ...board,
          workspaceName,
          teamMemberMap,
          taskViewersMap,
          groups: virtualGroups,
          isHqView: true,
        };
      }

      // Regular board - fetch with parallel queries
      const [teamMembersResult, groupsResult] = await Promise.all([
        supabase.from('team_members').select('*'),
        supabase.from('task_groups').select('*').eq('board_id', boardId).order('sort_order')
      ]);
      
      if (teamMembersResult.error) throw teamMembersResult.error;
      if (groupsResult.error) throw groupsResult.error;

      const teamMemberMap = new Map(teamMembersResult.data?.map(m => [m.id, {
        id: m.id,
        name: m.name,
        initials: m.initials,
        color: m.color,
        email: m.email,
      }]) || []);

      const groups = groupsResult.data || [];
      const groupIds = groups.map((g) => g.id);
      
      let tasks: any[] = [];
      let taskPeopleMap = new Map<string, any[]>();
      let taskViewersMap = new Map<string, string[]>();
      
      if (groupIds.length > 0) {
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*, comments(count)')
          .in('group_id', groupIds)
          .order('sort_order');

        if (tasksError) throw tasksError;
        tasks = (tasksData || []).map(t => ({
          ...t,
          comment_count: t.comments?.[0]?.count || 0,
        }));
        
        // Fetch task_people and task_viewers for all tasks in parallel
        const taskIds = tasks.map(t => t.id);
        if (taskIds.length > 0) {
          const [taskPeopleResult, taskViewersResult] = await Promise.all([
            supabase
              .from('task_people')
              .select('task_id, team_member_id')
              .in('task_id', taskIds),
            supabase
              .from('task_viewers')
              .select('task_id, team_member_id')
              .in('task_id', taskIds)
          ]);
          
          if (taskPeopleResult.error) throw taskPeopleResult.error;
          if (taskViewersResult.error) throw taskViewersResult.error;
          
          // Map task_id to array of team members
          taskPeopleResult.data?.forEach(tp => {
            const member = teamMemberMap.get(tp.team_member_id);
            if (member) {
              const existing = taskPeopleMap.get(tp.task_id) || [];
              existing.push(member);
              taskPeopleMap.set(tp.task_id, existing);
            }
          });
          
          // Map task_id to array of viewer IDs
          taskViewersResult.data?.forEach(tv => {
            const existing = taskViewersMap.get(tv.task_id) || [];
            existing.push(tv.team_member_id);
            taskViewersMap.set(tv.task_id, existing);
          });
        }
      }

      return {
        ...board,
        workspaceName,
        teamMemberMap,
        taskViewersMap,
        groups: groups.map((g) => ({
          ...g,
          tasks: tasks.filter((t) => t.group_id === g.id).map(t => ({
            ...t,
            people: taskPeopleMap.get(t.id) || [],
          })),
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
    staleTime: 30000, // Cache for 30 seconds - refresh more frequently for name changes
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
    mutationFn: async (task: { 
      group_id: string; 
      name?: string;
      branch?: string;           
      project_manager_id?: string;  
    }) => {
      // Branch and project_manager_id are required by database constraints
      // If not provided, use default values (will be updated by user after creation)
      if (!task.branch || !task.project_manager_id) {
        throw new Error('Branch and Project Manager are required. Please use the Multiple WO tool to create tasks.');
      }

      // The database trigger will auto-generate the work order number
      const { data, error } = await supabase
        .from('tasks')
        .insert({ 
          group_id: task.group_id, 
          name: task.name || '',
          branch: task.branch,
          project_manager_id: task.project_manager_id,
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

// Map of personnel field IDs to friendly names
const personnelFieldNames: Record<string, string> = {
  project_manager_id: 'Project Manager',
  director_id: 'Director',
  tecnico_id: 'Técnico',
  qc_1_id: 'QC 1',
  qc_retakes_id: 'QC Retakes',
  mixer_bogota_id: 'Mixer Bogotá',
  mixer_miami_id: 'Mixer Miami',
  qc_mix_id: 'QC Mix',
  traductor_id: 'Translator',
  adaptador_id: 'Adapter',
};

// Fields that store team_member IDs
const personnelFields = Object.keys(personnelFieldNames);

export function useUpdateTask(boardId: string, currentUserId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Record<string, any> }) => {
      // Handle _checkStartedAt flag - this is NOT a database field
      const shouldCheckStartedAt = updates._checkStartedAt;
      delete updates._checkStartedAt;
      
      // Check if we need to fetch current task for logging or started_at check
      const hasPersonnelFields = Object.keys(updates).some(key => personnelFields.includes(key));
      const needsFetch = hasPersonnelFields || shouldCheckStartedAt;
      
      let currentTask: Record<string, any> | null = null;
      let personnelNames = new Map<string, string>();
      
      if (needsFetch) {
        // Fetch current task values
        const { data, error: fetchError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (fetchError) throw fetchError;
        currentTask = data;
        
        // Set started_at if changing to 'working' and not already set
        if (shouldCheckStartedAt && !currentTask.started_at) {
          updates.started_at = new Date().toISOString();
        }

        // Collect all personnel IDs that need name resolution
        if (hasPersonnelFields) {
          const personnelIdsToResolve = new Set<string>();
          
          for (const [key, newValue] of Object.entries(updates)) {
            if (personnelFields.includes(key)) {
              const oldValue = currentTask[key];
              if (oldValue) personnelIdsToResolve.add(oldValue);
              if (newValue) personnelIdsToResolve.add(newValue);
            }
          }

          // Fetch names for all personnel IDs at once
          if (personnelIdsToResolve.size > 0) {
            const { data: members } = await supabase
              .from('team_members')
              .select('id, name')
              .in('id', Array.from(personnelIdsToResolve));
            
            members?.forEach(m => personnelNames.set(m.id, m.name));
          }
        }
      }

      // Update the task - this is the main operation
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...updates, last_updated: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      // Log activity only for personnel field changes (skip for simple fields to improve performance)
      if (hasPersonnelFields && currentTask) {
        const activityLogs: Array<{
          task_id: string;
          type: string;
          field: string;
          old_value: string | null;
          new_value: string | null;
          user_id: string | null;
        }> = [];

        for (const [key, newValue] of Object.entries(updates)) {
          if (!personnelFields.includes(key)) continue;
          
          const oldValue = currentTask[key];
          if (oldValue === newValue) continue;
          
          const fieldName = personnelFieldNames[key];
          const oldStr = oldValue ? personnelNames.get(oldValue) || null : null;
          const newStr = newValue ? personnelNames.get(newValue) || null : null;
          
          // Use semantic type based on whether assigning or unassigning
          let activityType = 'field_change';
          if (newStr && !oldStr) {
            activityType = 'task_assigned';
          } else if (!newStr && oldStr) {
            activityType = 'task_unassigned';
          }
          
          activityLogs.push({
            task_id: taskId,
            type: activityType,
            field: key, // Store the raw field name for the formatter
            old_value: oldStr,
            new_value: newStr,
            user_id: currentUserId || null,
          });
        }

        if (activityLogs.length > 0) {
          await supabase.from('activity_log').insert(activityLogs);
        }
      }

      return data;
    },
    // Optimistic update for immediate UI response
    onMutate: async ({ taskId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['board', boardId] });

      // Snapshot the previous value
      const previousBoard = queryClient.getQueryData(['board', boardId]);

      // Optimistically update the cache
      queryClient.setQueryData(['board', boardId], (old: any) => {
        if (!old?.groups) return old;
        
        return {
          ...old,
          groups: old.groups.map((group: any) => ({
            ...group,
            tasks: group.tasks.map((task: any) => {
              if (task.id === taskId) {
                // Apply updates to the task
                const updatedTask = { ...task };
                for (const [key, value] of Object.entries(updates)) {
                  // Map database column names to task property names
                  const propKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                  updatedTask[propKey] = value;
                  updatedTask[key] = value; // Also set the original key
                }
                return updatedTask;
              }
              return task;
            }),
          })),
        };
      });

      return { previousBoard };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousBoard) {
        queryClient.setQueryData(['board', boardId], context.previousBoard);
      }
    },
    onSettled: () => {
      // Refetch after mutation settles (but UI already updated)
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

export function useDeleteTaskGroup(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('task_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
}
