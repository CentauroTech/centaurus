import { useState } from 'react';
import { AlertTriangle, Clock, Users, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LinguisticTask } from '@/hooks/useLinguisticTasks';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface AIInsight {
  type: 'deadline_risk' | 'stale' | 'workload';
  title: string;
  description: string;
  taskIds: string[];
  severity: 'high' | 'medium' | 'low';
}

interface LinguisticAITabProps {
  tasks: LinguisticTask[];
  onSelectTask: (taskId: string) => void;
}

const INSIGHT_CONFIG: Record<string, { icon: typeof AlertTriangle; color: string }> = {
  deadline_risk: { icon: AlertTriangle, color: 'border-red-200 bg-red-50' },
  stale: { icon: Clock, color: 'border-amber-200 bg-amber-50' },
  workload: { icon: Users, color: 'border-blue-200 bg-blue-50' },
};

export function LinguisticAITab({ tasks, onSelectTask }: LinguisticAITabProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      // Prepare task metadata (no full comment bodies)
      const metadata = tasks.map(t => ({
        id: t.id,
        name: t.name,
        phase: t.phase,
        status: t.status,
        phaseDueDate: t.phaseDueDate,
        hasRequiredFile: t.phase === 'translation' ? t.hasTranslatedFile : t.hasAdaptedFile,
        guestSignal: t.guestSignal,
        lastUpdated: t.lastUpdated?.toISOString() || null,
        assignee: t.phase === 'translation' ? t.traductor?.name : t.adaptador?.name,
        clientName: t.clientName,
        workOrderNumber: t.workOrderNumber,
      }));

      const { data, error } = await supabase.functions.invoke('linguistic-ai-analysis', {
        body: { tasks: metadata },
      });

      if (error) throw error;
      setInsights(data?.insights || []);
      setHasRun(true);
    } catch (err) {
      console.error('AI analysis error:', err);
      // Fallback to client-side heuristic analysis
      const fallbackInsights = runLocalAnalysis(tasks);
      setInsights(fallbackInsights);
      setHasRun(true);
    } finally {
      setLoading(false);
    }
  };

  if (!hasRun) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Sparkles className="w-10 h-10 text-primary opacity-50" />
        <div className="text-center">
          <p className="text-lg font-medium">AI Analysis</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Analyze {tasks.length} active linguistic tasks for deadline risks, stale work, and workload imbalances.
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={loading || tasks.length === 0} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Run Analysis
        </Button>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-lg font-medium text-green-600">All Clear ✓</p>
        <p className="text-sm text-muted-foreground">No actionable signals detected.</p>
        <Button variant="outline" size="sm" onClick={runAnalysis} disabled={loading} className="gap-2 mt-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Re-run Analysis
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{insights.length} signals found</p>
        <Button variant="outline" size="sm" onClick={runAnalysis} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Refresh
        </Button>
      </div>
      
      <div className="grid gap-3">
        {insights.map((insight, i) => {
          const config = INSIGHT_CONFIG[insight.type] || INSIGHT_CONFIG.stale;
          const Icon = config.icon;
          return (
            <div key={i} className={cn("border rounded-lg p-4", config.color)}>
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                  {insight.taskIds.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {insight.taskIds.slice(0, 3).map(id => {
                        const task = tasks.find(t => t.id === id);
                        return task ? (
                          <button
                            key={id}
                            onClick={() => onSelectTask(id)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-background hover:bg-muted border transition-colors"
                          >
                            <span className="truncate max-w-[120px]">{task.name}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </button>
                        ) : null;
                      })}
                      {insight.taskIds.length > 3 && (
                        <span className="text-xs text-muted-foreground self-center">+{insight.taskIds.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Local fallback analysis when edge function is unavailable
function runLocalAnalysis(tasks: LinguisticTask[]): AIInsight[] {
  const insights: AIInsight[] = [];
  const now = new Date();

  // Deadline risk: due soon + missing file + no updates
  const atRisk = tasks.filter(t => {
    if (!t.phaseDueDate) return false;
    const due = new Date(t.phaseDueDate);
    const daysLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const missingFile = t.phase === 'translation' ? !t.hasTranslatedFile : !t.hasAdaptedFile;
    return daysLeft <= 3 && daysLeft > -7 && missingFile;
  });
  if (atRisk.length > 0) {
    insights.push({
      type: 'deadline_risk',
      title: `${atRisk.length} task${atRisk.length > 1 ? 's' : ''} likely to miss deadline`,
      description: 'Due within 3 days with required file still missing.',
      taskIds: atRisk.map(t => t.id),
      severity: 'high',
    });
  }

  // Stale tasks: no updates in 3+ days
  const stale = tasks.filter(t => {
    if (!t.lastUpdated) return true;
    const daysSince = (now.getTime() - t.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= 3;
  });
  if (stale.length > 0) {
    insights.push({
      type: 'stale',
      title: `${stale.length} stale task${stale.length > 1 ? 's' : ''}`,
      description: 'No updates in 3+ days. Consider checking progress.',
      taskIds: stale.map(t => t.id),
      severity: 'medium',
    });
  }

  // Workload imbalance: count per assignee
  const assigneeCounts = new Map<string, { name: string; count: number; taskIds: string[] }>();
  tasks.forEach(t => {
    const assignee = t.phase === 'translation' ? t.traductor : t.adaptador;
    if (!assignee) return;
    const existing = assigneeCounts.get(assignee.id) || { name: assignee.name, count: 0, taskIds: [] };
    existing.count++;
    existing.taskIds.push(t.id);
    assigneeCounts.set(assignee.id, existing);
  });
  const counts = Array.from(assigneeCounts.values());
  if (counts.length > 1) {
    const avg = counts.reduce((s, c) => s + c.count, 0) / counts.length;
    const overloaded = counts.filter(c => c.count > avg * 1.5 && c.count >= 3);
    overloaded.forEach(o => {
      insights.push({
        type: 'workload',
        title: `${o.name} has ${o.count} tasks (avg: ${Math.round(avg)})`,
        description: 'Potential workload imbalance. Consider redistributing.',
        taskIds: o.taskIds,
        severity: 'low',
      });
    });
  }

  return insights;
}
