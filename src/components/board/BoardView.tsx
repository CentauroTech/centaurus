import { useState } from 'react';
import { Plus, Filter, Users, Calendar, ListPlus, Lock, Unlock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MemoizedBoardGroup } from './MemoizedBoardGroup';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { MultipleWODialog } from './MultipleWODialog';
import { TaskSelectionProvider } from '@/contexts/TaskSelectionContext';
import { BulkEditProvider, BulkUpdateParams } from '@/contexts/BulkEditContext';
import {
  useAddTaskGroup, 
  useUpdateTaskGroup, 
  useAddTask, 
  useUpdateTask, 
  useDeleteTask 
} from '@/hooks/useWorkspaces';
import { useMoveToNextPhase } from '@/hooks/usePhaseProgression';
import { 
  useBulkDuplicate, 
  useBulkDelete, 
  useBulkMoveToPhase, 
  useMoveTaskToPhase,
  useBulkUpdateField,
  AVAILABLE_PHASES 
} from '@/hooks/useBulkTaskActions';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { useAddMultipleTasks } from '@/hooks/useAddMultipleTasks';
import { useColumnOrder } from '@/hooks/useColumnOrder';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { User } from '@/types/board';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BoardGroup {
  id: string;
  board_id: string;
  name: string;
  color: string;
  is_collapsed: boolean;
  sort_order: number;
  tasks: any[];
}

interface BoardData {
  id: string;
  workspace_id: string;
  workspaceName?: string;
  name: string;
  is_hq: boolean;
  groups: BoardGroup[];
  teamMemberMap?: Map<string, any>;
  taskViewersMap?: Map<string, string[]>;
}

interface BoardViewProps {
  board: BoardData;
  boardId: string;
}

function BoardViewContent({ board, boardId }: BoardViewProps) {
  const workspaceName = board.workspaceName || '';
  const { data: currentTeamMember } = useCurrentTeamMember();
  const currentUserId = currentTeamMember?.id || null;
  const queryClient = useQueryClient();
  const [isMultipleWODialogOpen, setIsMultipleWODialogOpen] = useState(false);
  
  // Permissions
  const { isAdmin, canReorderColumns, canCreateGroups, canDeleteTasks } = usePermissions();
  
  // Column order management
  const { columns, isLocked, reorderColumns, toggleLock, resetOrder } = useColumnOrder(boardId, workspaceName);
  
  const addTaskGroupMutation = useAddTaskGroup(boardId);
  const updateTaskGroupMutation = useUpdateTaskGroup(boardId);
  const addTaskMutation = useAddTask(boardId);
  const updateTaskMutation = useUpdateTask(boardId, currentUserId);
  const deleteTaskMutation = useDeleteTask(boardId);
  const moveToNextPhaseMutation = useMoveToNextPhase(boardId, currentUserId);
  const moveTaskToPhaseMutation = useMoveTaskToPhase(boardId, currentUserId);
  const bulkDuplicateMutation = useBulkDuplicate(boardId);
  const bulkDeleteMutation = useBulkDelete(boardId);
  const bulkMoveMutation = useBulkMoveToPhase(boardId, currentUserId);
  const bulkUpdateFieldMutation = useBulkUpdateField(boardId, currentUserId);
  const addMultipleTasksMutation = useAddMultipleTasks(boardId);


  // Check if this is a Kickoff board
  const isKickoffBoard = board.name.toLowerCase().includes('kickoff');

  // Handle people updates (junction table)
  const updatePeople = async (taskId: string, newPeople: User[], oldPeople: User[]) => {
    // Delete existing people for this task
    await supabase.from('task_people').delete().eq('task_id', taskId);
    
    // Insert new people
    if (newPeople.length > 0) {
      await supabase.from('task_people').insert(
        newPeople.map(p => ({ task_id: taskId, team_member_id: p.id }))
      );
    }
    
    // Log the change
    const oldNames = oldPeople.map(p => p.name).join(', ') || null;
    const newNames = newPeople.map(p => p.name).join(', ') || null;
    
    if (oldNames !== newNames) {
      await supabase.from('activity_log').insert({
        task_id: taskId,
        type: 'field_change',
        field: 'people',
        old_value: oldNames,
        new_value: newNames,
        user_id: currentUserId,
      });
    }
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    queryClient.invalidateQueries({ queryKey: ['activity-log'] });
  };

  const updateTask = (taskId: string, updates: Record<string, any>, groupId?: string, pruebaDeVoz?: string | null, currentStatus?: string) => {
    // STATUS LOCKING: Block status change FROM "Done" unless admin
    if (updates.status && currentStatus === 'done' && updates.status !== 'done' && !isAdmin) {
      console.error('Cannot change status after task is marked as Done. Contact admin to revert.');
      return;
    }

    // TIMER TRACKING: Set started_at when changing TO "Working on It"
    if (updates.status === 'working' && currentStatus !== 'working') {
      // We'll set started_at in the mutation if not already set
      updates._checkStartedAt = true;
    }

    // TIMER TRACKING: Set completed_at when changing TO "Done"
    if (updates.status === 'done') {
      updates.completed_at = new Date().toISOString();
    }

    // If status is changing to 'done', trigger phase progression
    if (updates.status === 'done' && groupId) {
      updateTaskMutation.mutate({ taskId, updates }, {
        onSuccess: () => {
          // Move to next phase after status update
          moveToNextPhaseMutation.mutate({
            taskId,
            currentGroupId: groupId,
            pruebaDeVoz: pruebaDeVoz ?? null,
          });
        },
      });
    } else {
      updateTaskMutation.mutate({ taskId, updates });
    }
  };

  const deleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };

  const addTask = (groupId: string) => {
    // Single task creation requires branch and project_manager_id
    // Show error toast prompting to use Multiple WO tool
    addTaskMutation.mutate({ group_id: groupId }, {
      onError: (error) => {
        console.error('Use Multiple WO tool:', error.message);
      }
    });
  };

  const updateGroup = (groupId: string, updates: Partial<{ name: string; color: string; is_collapsed: boolean }>) => {
    updateTaskGroupMutation.mutate({ groupId, updates });
  };

  const addGroup = () => {
    const colors = [
      'hsl(209, 100%, 46%)',
      'hsl(154, 64%, 45%)',
      'hsl(270, 50%, 60%)',
      'hsl(25, 95%, 53%)',
      'hsl(0, 72%, 51%)',
    ];
    
    addTaskGroupMutation.mutate({
      name: 'New Group',
      color: colors[board.groups.length % colors.length],
    });
  };

  const handleBulkDuplicate = (taskIds: string[]) => {
    bulkDuplicateMutation.mutate(taskIds);
  };

  const handleBulkDelete = (taskIds: string[]) => {
    bulkDeleteMutation.mutate(taskIds);
  };

  const handleBulkMove = (taskIds: string[], phase: string) => {
    bulkMoveMutation.mutate({ taskIds, targetPhase: phase });
  };

  const handleSendTaskToPhase = (taskId: string, phase: string) => {
    moveTaskToPhaseMutation.mutate({ taskId, targetPhase: phase });
  };

  const handleBulkUpdate = (params: BulkUpdateParams) => {
    bulkUpdateFieldMutation.mutate({
      taskIds: params.taskIds,
      field: params.field,
      value: params.value,
      displayField: params.displayField,
    });
  };

  return (
    <BulkEditProvider onBulkUpdate={handleBulkUpdate}>
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="w-4 h-4" />
            Person
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="w-4 h-4" />
            Due date
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Column Lock/Unlock - Admin only */}
          {isAdmin && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={toggleLock} 
                    size="sm" 
                    variant={isLocked ? "default" : "outline"}
                    className="gap-2"
                  >
                    {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    {isLocked ? 'Locked' : 'Unlocked'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isLocked ? 'Click to unlock column reordering' : 'Click to lock column order'}
                </TooltipContent>
              </Tooltip>
              
              {!isLocked && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={resetOrder} 
                      size="sm" 
                      variant="ghost"
                      className="gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset to default column order</TooltipContent>
                </Tooltip>
              )}
            </>
          )}

          {isKickoffBoard && (
            <Button 
              onClick={() => setIsMultipleWODialogOpen(true)} 
              size="sm" 
              variant="outline"
              className="gap-2"
            >
              <ListPlus className="w-4 h-4" />
              Multiple WO
            </Button>
          )}
          {canCreateGroups && (
            <Button onClick={addGroup} size="sm" className="gap-2" disabled={addTaskGroupMutation.isPending}>
              <Plus className="w-4 h-4" />
              New Group
            </Button>
          )}
        </div>
      </div>

      {/* Multiple WO Dialog */}
      <MultipleWODialog
        isOpen={isMultipleWODialogOpen}
        onClose={() => setIsMultipleWODialogOpen(false)}
        onCreateTasks={(groupId, template, names) => {
          addMultipleTasksMutation.mutate({ groupId, template, names });
        }}
        groups={board.groups.map(g => ({ id: g.id, name: g.name, color: g.color }))}
        isCreating={addMultipleTasksMutation.isPending}
      />

      {/* Scrollable Board Area */}
      <div className="flex-1 overflow-auto custom-scrollbar">
      {/* Task Groups - Use virtualization for large groups (100+ tasks) */}
        <div className="space-y-6 min-w-max">
          {board.groups.map((group) => (
            <MemoizedBoardGroup
              key={group.id}
              group={group}
              board={board}
              columns={columns}
              boardId={boardId}
              workspaceName={workspaceName}
              isLocked={isLocked}
              canReorderColumns={canReorderColumns}
              canDeleteTasks={canDeleteTasks}
              updatePeople={updatePeople}
              updateTask={updateTask}
              deleteTask={deleteTask}
              addTask={addTask}
              updateGroup={updateGroup}
              handleSendTaskToPhase={handleSendTaskToPhase}
              reorderColumns={reorderColumns}
            />
          ))}
        </div>

        {/* Empty State */}
        {board.groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">No groups yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first group to start organizing tasks
            </p>
            <Button onClick={addGroup} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Group
            </Button>
          </div>
        )}
      </div>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        onDuplicate={handleBulkDuplicate}
        onDelete={handleBulkDelete}
        onMoveToPhase={handleBulkMove}
        availablePhases={AVAILABLE_PHASES}
      />
    </div>
    </BulkEditProvider>
  );
}

export function BoardView({ board, boardId }: BoardViewProps) {
  return (
    <TaskSelectionProvider>
      <BoardViewContent board={board} boardId={boardId} />
    </TaskSelectionProvider>
  );
}
