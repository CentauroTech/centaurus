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
        let taskPeopleMap = new Map<string, any[]>();
        
        if (allGroupIds.length > 0) {
          const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('*, comments(count)')
            .in('group_id', allGroupIds)
            .order('sort_order');

          if (tasksError) throw tasksError;
          allTasks = (tasksData || []).map(t => ({
            ...t,
            comment_count: t.comments?.[0]?.count || 0,
          }));
          
          // Fetch task_people for all tasks
          const allTaskIds = allTasks.map(t => t.id);
          if (allTaskIds.length > 0) {
            const { data: taskPeopleData, error: tpError } = await supabase
              .from('task_people')
              .select('task_id, team_member_id')
              .in('task_id', allTaskIds);
            
            if (tpError) throw tpError;
            
            // Map task_id to array of team members
            taskPeopleData?.forEach(tp => {
              const member = teamMemberMap.get(tp.team_member_id);
              if (member) {
                const existing = taskPeopleMap.get(tp.task_id) || [];
                existing.push(member);
                taskPeopleMap.set(tp.task_id, existing);
              }
            });
          }
        }

        // Extract phase from board name (e.g., "Col-Kickoff" -> "Kickoff", "Mia-Recording" -> "Recording")
        const extractPhase = (boardName: string): string => {
          const parts = boardName.split('-');
          return parts.length > 1 ? parts.slice(1).join('-') : boardName;
        };

        // Add currentPhase and people to each task based on its board
        const tasksWithPhase = allTasks.map(t => {
          const boardId = groupToBoardMap.get(t.group_id);
          const boardName = boardId ? boardMap.get(boardId) : 'Unknown';
          return {
            ...t,
            currentPhase: extractPhase(boardName || 'Unknown'),
            people: taskPeopleMap.get(t.id) || [],
          };
        });

        // Group all tasks into one "Projects in Production" group
        const virtualGroups = [{
          id: `hq-all-projects`,
          board_id: board.id,
          name: 'Projects in Production',
          color: 'hsl(209, 100%, 46%)',
          is_collapsed: false,
          sort_order: 0,
          tasks: tasksWithPhase,
          isVirtual: true, // Mark as virtual group (read-only in HQ)
        }];

        return {
          ...board,
          workspaceName,
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
      let taskPeopleMap = new Map<string, any[]>();
      
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
        
        // Fetch task_people for all tasks
        const taskIds = tasks.map(t => t.id);
        if (taskIds.length > 0) {
          const { data: taskPeopleData, error: tpError } = await supabase
            .from('task_people')
            .select('task_id, team_member_id')
            .in('task_id', taskIds);
          
          if (tpError) throw tpError;
          
          // Map task_id to array of team members
          taskPeopleData?.forEach(tp => {
            const member = teamMemberMap.get(tp.team_member_id);
            if (member) {
              const existing = taskPeopleMap.get(tp.task_id) || [];
              existing.push(member);
              taskPeopleMap.set(tp.task_id, existing);
            }
          });
        }
      }

      return {
        ...board,
        workspaceName,
        teamMemberMap,
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
      // Check if we need to fetch current task for logging
      // Only fetch for personnel fields that need name resolution
      const hasPersonnelFields = Object.keys(updates).some(key => personnelFields.includes(key));
      
      let currentTask: Record<string, any> | null = null;
      let personnelNames = new Map<string, string>();
      
      if (hasPersonnelFields) {
        // Fetch current task values only for personnel fields
        const { data, error: fetchError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (fetchError) throw fetchError;
        currentTask = data;

        // Collect all personnel IDs that need name resolution
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
          
          activityLogs.push({
            task_id: taskId,
            type: 'field_change',
            field: fieldName,
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
