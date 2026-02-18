import { Shield, Clock, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Task } from '@/types/board';
import { QC_PHASE_LABELS } from '@/hooks/useQCTasks';
import { Button } from '@/components/ui/button';
import { useAddComment } from '@/hooks/useComments';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { toast } from 'sonner';

const QC_PHASES_SET = new Set(['qc_premix', 'qc_retakes', 'mix', 'qc_mix', 'mix_retakes', 'QC Premix', 'QC Retakes', 'Mix', 'QC Mix', 'Mix Retakes', 'QC-Mix', 'QC-Premix', 'MixRetakes', 'Premix', 'Retakes']);

interface QCSummaryStripProps {
  task: Task;
}

export function QCSummaryStrip({ task }: QCSummaryStripProps) {
  const phase = task.currentPhase || task.fase || '';
  const normalizedPhase = phase.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/\s+/g, '_');
  const { data: currentMember } = useCurrentTeamMember();
  const addComment = useAddComment(task.id, '');

  // Only show for QC phases
  const isQCPhase = QC_PHASES_SET.has(phase) || 
    ['qc_premix', 'qc_retakes', 'mix', 'qc_mix', 'mix_retakes', 'premix', 'retakes'].includes(normalizedPhase);
  
  if (!isQCPhase) return null;

  const handleRequestUpdate = async () => {
    if (!currentMember?.id) return;
    try {
      await addComment.mutateAsync({
        content: `<p>📋 <strong>Update Request:</strong> Please provide a status update on this task.</p>`,
        userId: currentMember.id,
        mentionedUserIds: [],
        isGuestVisible: true,
        phase,
      });
      toast.success('Update request sent');
    } catch {
      toast.error('Failed to send request');
    }
  };

  // Get stage-specific due date
  const getDueDate = () => {
    if (normalizedPhase.includes('premix') && !normalizedPhase.includes('qc')) return task.premixDueDate;
    if (normalizedPhase.includes('qcpremix') || normalizedPhase === 'qc_premix') return task.qcPremixDueDate;
    if (normalizedPhase.includes('retakes') && normalizedPhase.includes('qc')) return task.qcRetakesDueDate;
    if (normalizedPhase === 'retakes') return task.retakesDueDate;
    if (normalizedPhase.includes('qcmix') || normalizedPhase === 'qc_mix') return task.qcMixDueDate;
    if (normalizedPhase === 'mix' || normalizedPhase.includes('mixbogota')) return task.mixDueDate;
    if (normalizedPhase.includes('mixretakes') || normalizedPhase === 'mix_retakes') return task.mixRetakesDueDate;
    return task.phaseDueDate;
  };

  const dueDate = getDueDate();

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-purple-50 dark:bg-purple-950/20 border-b text-xs">
      <Shield className="w-4 h-4 text-purple-600 shrink-0" />
      <span className="font-medium text-purple-700 dark:text-purple-300">QC Summary</span>
      
      {task.branch && (
        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium",
          task.branch === 'Miami' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
        )}>
          {task.branch}
        </span>
      )}
      
      <span className="px-1.5 py-0.5 rounded bg-purple-200 text-purple-800 text-[10px] font-medium">
        {QC_PHASE_LABELS[normalizedPhase] || phase}
      </span>

      {dueDate && (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3 h-3" />
          Due: {format(new Date(String(dueDate)), 'MMM d')}
        </span>
      )}

      <div className="ml-auto">
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-purple-600" onClick={handleRequestUpdate}>
          <MessageSquare className="w-3 h-3" />
          Request Update
        </Button>
      </div>
    </div>
  );
}
