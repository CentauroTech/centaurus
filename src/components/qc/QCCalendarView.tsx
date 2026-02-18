import { useMemo, useCallback } from 'react';
import { CalendarView } from '@/components/board/CalendarView';
import { Task, User } from '@/types/board';
import { QCTask, QC_PHASE_DUE_DATE_FIELD } from '@/hooks/useQCTasks';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const FIELD_TO_DB_COLUMN: Record<string, string> = {
  qcPremixDueDate: 'qc_premix_due_date',
  qcRetakesDueDate: 'qc_retakes_due_date',
  mixDueDate: 'mix_due_date',
  qcMixDueDate: 'qc_mix_due_date',
  mixRetakesDueDate: 'mix_retakes_due_date',
  entregaMiamiEnd: 'entrega_miami_end',
  entregaCliente: 'entrega_cliente',
};

interface QCCalendarViewProps {
  tasks: QCTask[];
  teamMemberMap: Map<string, User>;
  onTaskClick?: (taskId: string) => void;
  workspaceIds: string[];
}

export function QCCalendarView({ tasks, teamMemberMap, onTaskClick, workspaceIds }: QCCalendarViewProps) {
  const queryClient = useQueryClient();

  const calendarTasks = useMemo((): Task[] => {
    return tasks.map(qt => ({
      id: qt.id,
      name: qt.name,
      status: qt.status as any,
      branch: qt.branch,
      clientName: qt.clientName,
      workOrderNumber: qt.workOrderNumber,
      fase: qt.phase as any,
      currentPhase: qt.phase,
      projectManager: qt.projectManager,
      groupId: qt.groupId,
      lastUpdated: qt.lastUpdated || undefined,
      // Map ALL QC date fields regardless of current phase
      qcPremixDueDate: qt.qcPremixDueDate || undefined,
      qcRetakesDueDate: qt.qcRetakesDueDate || undefined,
      mixDueDate: qt.mixDueDate || undefined,
      qcMixDueDate: qt.qcMixDueDate || undefined,
      mixRetakesDueDate: qt.mixRetakesDueDate || undefined,
      entregaMiamiEnd: qt.entregaMiamiEnd || undefined,
      entregaCliente: qt.entregaCliente || undefined,
    } as Task));
  }, [tasks]);

  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
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

    queryClient.invalidateQueries({ queryKey: ['qc-tasks', workspaceIds] });
  }, [workspaceIds, queryClient]);

  return (
    <CalendarView
      tasks={calendarTasks}
      onTaskClick={onTaskClick}
      onUpdateTask={handleUpdateTask}
      boardName="qc-center"
      isHQ={true}
      defaultEnabledSources={['qc_premix', 'qc_retakes', 'mix', 'qc_mix', 'mix_retakes', 'miami', 'client']}
    />
  );
}
