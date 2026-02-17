import { useMemo, useCallback } from 'react';
import { CalendarView } from '@/components/board/CalendarView';
import { Task, User } from '@/types/board';
import { LinguisticTask } from '@/hooks/useLinguisticTasks';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Map camelCase Task fields to snake_case DB columns for updates
const FIELD_TO_DB_COLUMN: Record<string, string> = {
  translationDueDate: 'translation_due_date',
  adaptingDueDate: 'adapting_due_date',
  entregaMiamiEnd: 'entrega_miami_end',
  entregaCliente: 'entrega_cliente',
};

interface LinguisticCalendarViewProps {
  tasks: LinguisticTask[];
  teamMemberMap: Map<string, User>;
  onTaskClick?: (taskId: string) => void;
  workspaceId: string | null;
}

export function LinguisticCalendarView({ tasks, teamMemberMap, onTaskClick, workspaceId }: LinguisticCalendarViewProps) {
  const queryClient = useQueryClient();

  // Convert LinguisticTask[] to Task[] for CalendarView compatibility
  const calendarTasks = useMemo((): Task[] => {
    return tasks.map(lt => ({
      id: lt.id,
      name: lt.name,
      status: lt.status as any,
      branch: lt.branch,
      clientName: lt.clientName,
      workOrderNumber: lt.workOrderNumber,
      fase: lt.phase as any,
      currentPhase: lt.phase,
      translationDueDate: lt.translationDueDate || undefined,
      adaptingDueDate: lt.adaptingDueDate || undefined,
      entregaMiamiEnd: lt.entregaMiamiEnd || undefined,
      entregaCliente: lt.entregaCliente || undefined,
      projectManager: lt.projectManager,
      traductor: lt.traductor,
      adaptador: lt.adaptador,
      groupId: lt.groupId,
      lastUpdated: lt.lastUpdated || undefined,
    } as Task));
  }, [tasks]);

  // Handle task updates (drag-drop rescheduling)
  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    // Convert camelCase fields to snake_case for DB
    const dbUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      const dbCol = FIELD_TO_DB_COLUMN[key];
      if (dbCol) {
        dbUpdates[dbCol] = value;
      }
    }

    if (Object.keys(dbUpdates).length === 0) return;

    const { error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', taskId);

    if (error) {
      toast.error('Failed to update date');
      console.error('Update error:', error);
      return;
    }

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['linguistic-tasks', workspaceId] });
  }, [workspaceId, queryClient]);

  return (
    <CalendarView
      tasks={calendarTasks}
      onTaskClick={onTaskClick}
      onUpdateTask={handleUpdateTask}
      boardName="linguistic-center"
      isHQ={true}
      defaultEnabledSources={['miami', 'client', 'translation', 'adapting']}
    />
  );
}
