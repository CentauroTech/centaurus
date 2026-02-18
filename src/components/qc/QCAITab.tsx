import { useState } from 'react';
import { AlertTriangle, Clock, Users, ExternalLink, Loader2, Sparkles, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QCTask } from '@/hooks/useQCTasks';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface AIInsight {
  type: 'deadline_risk' | 'stale' | 'workload' | 'waiting_vendor';
  title: string;
  description: string;
  taskIds: string[];
  severity: 'high' | 'medium' | 'low';
}

interface QCAITabProps {
  tasks: QCTask[];
  onSelectTask: (taskId: string) => void;
}

const INSIGHT_CONFIG: Record<string, { icon: typeof AlertTriangle; color: string }> = {
  deadline_risk: { icon: AlertTriangle, color: 'border-red-200 bg-red-50' },
  stale: { icon: Clock, color: 'border-amber-200 bg-amber-50' },
  workload: { icon: Users, color: 'border-blue-200 bg-blue-50' },
  waiting_vendor: { icon: UserX, color: 'border-purple-200 bg-purple-50' },
};

export function QCAITab({ tasks, onSelectTask }: QCAITabProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const metadata = tasks.map(t => ({
        id: t.id,
        name: t.name,
        phase: t.phase,
        status: t.status,
        phaseDueDate: t.phaseDueDate,
        submissionStatus: t.submissionStatus,
        guestSignal: t.guestSignal,
        lastUpdated: t.lastUpdated?.toISOString() || null,
        assignee: t.assignee?.name || null,
        branch: t.branch,
        clientName: t.clientName,
      }));

      const { data, error } = await supabase.functions.invoke('qc-ai-analysis', {
        body: { tasks: metadata },
      });

      if (error) throw error;
      setInsights(data?.insights || []);
      setHasRun(true);
    } catch {
      // Fallback to local analysis
      setInsights(runLocalQCAnalysis(tasks));
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
          <p className="text-lg font-medium">QC AI Analysis</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Analyze {tasks.length} active QC tasks for deadline risks, stale work, vendor delays, and workload imbalances.
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
          Re-run
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

function runLocalQCAnalysis(tasks: QCTask[]): AIInsight[] {
  const insights: AIInsight[] = [];
  const now = new Date();

  // Deadline risk
  const atRisk = tasks.filter(t => {
    if (!t.phaseDueDate) return false;
    const days = (new Date(t.phaseDueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return days <= 3 && days > -7 && t.submissionStatus !== 'ready';
  });
  if (atRisk.length > 0) {
    insights.push({
      type: 'deadline_risk',
      title: `${atRisk.length} task${atRisk.length > 1 ? 's' : ''} likely to miss deadline`,
      description: 'Due within 3 days without required submission.',
      taskIds: atRisk.map(t => t.id),
      severity: 'high',
    });
  }

  // Stale tasks
  const stale = tasks.filter(t => {
    if (!t.lastUpdated) return true;
    return (now.getTime() - t.lastUpdated.getTime()) / (1000 * 60 * 60 * 24) >= 3;
  });
  if (stale.length > 0) {
    insights.push({
      type: 'stale',
      title: `${stale.length} stale task${stale.length > 1 ? 's' : ''}`,
      description: 'No updates in 3+ days.',
      taskIds: stale.map(t => t.id),
      severity: 'medium',
    });
  }

  // Waiting on vendor
  const waiting = tasks.filter(t => t.guestSignal === 'waiting');
  if (waiting.length > 0) {
    insights.push({
      type: 'waiting_vendor',
      title: `${waiting.length} task${waiting.length > 1 ? 's' : ''} waiting on vendor`,
      description: 'Internal reply sent, awaiting vendor response.',
      taskIds: waiting.map(t => t.id),
      severity: 'medium',
    });
  }

  // Workload imbalance
  const counts = new Map<string, { name: string; count: number; taskIds: string[] }>();
  tasks.forEach(t => {
    if (!t.assignee) return;
    const e = counts.get(t.assignee.id) || { name: t.assignee.name, count: 0, taskIds: [] };
    e.count++;
    e.taskIds.push(t.id);
    counts.set(t.assignee.id, e);
  });
  const arr = Array.from(counts.values());
  if (arr.length > 1) {
    const avg = arr.reduce((s, c) => s + c.count, 0) / arr.length;
    arr.filter(c => c.count > avg * 1.5 && c.count >= 3).forEach(o => {
      insights.push({
        type: 'workload',
        title: `${o.name} has ${o.count} tasks (avg: ${Math.round(avg)})`,
        description: 'Potential workload imbalance.',
        taskIds: o.taskIds,
        severity: 'low',
      });
    });
  }

  return insights;
}
