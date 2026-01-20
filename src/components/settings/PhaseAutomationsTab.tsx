import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, X, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  usePhaseAutomations,
  useAddPhaseAutomation,
  useRemovePhaseAutomation,
  PHASES,
  PHASE_LABELS,
  Phase,
} from '@/hooks/usePhaseAutomations';

// Map workspace names to branch names
const WORKSPACE_BRANCH_MAP: Record<string, string> = {
  'Miami': 'Miami',
  'Colombia': 'Colombia',
  'Estudios Externos': 'Estudios Externos',
};

export function PhaseAutomationsTab() {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  // Fetch workspaces
  const { data: workspaces, isLoading: loadingWorkspaces } = useQuery({
    queryKey: ['workspaces-for-automations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name')
        .in('name', ['Miami', 'Colombia', 'Estudios Externos'])
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Set default workspace to Miami when data loads
  useMemo(() => {
    if (workspaces && workspaces.length > 0 && !selectedWorkspaceId) {
      const miami = workspaces.find(w => w.name === 'Miami');
      setSelectedWorkspaceId(miami?.id || workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId]);

  // Fetch phase automations for selected workspace
  const { data: automations, isLoading: loadingAutomations } = usePhaseAutomations(selectedWorkspaceId || undefined);
  const addAutomation = useAddPhaseAutomation();
  const removeAutomation = useRemovePhaseAutomation();

  // Get selected workspace name for branch filtering
  const selectedWorkspaceName = useMemo(() => {
    return workspaces?.find(w => w.id === selectedWorkspaceId)?.name || '';
  }, [workspaces, selectedWorkspaceId]);

  const branchFilter = WORKSPACE_BRANCH_MAP[selectedWorkspaceName] || '';

  // Fetch team members filtered by branch for the selected workspace
  const { data: teamMembers, isLoading: loadingMembers } = useQuery({
    queryKey: ['team-members-for-automations', branchFilter],
    queryFn: async () => {
      if (!branchFilter) return [];
      
      // Get team members who have this branch assigned
      const { data, error } = await supabase
        .from('team_member_branches')
        .select(`
          team_member_id,
          team_members!inner(id, name, initials, color)
        `)
        .eq('branch', branchFilter);
      
      if (error) throw error;
      
      // Extract unique team members
      const memberMap = new Map();
      (data as any[]).forEach(item => {
        if (item.team_members && !memberMap.has(item.team_members.id)) {
          memberMap.set(item.team_members.id, item.team_members);
        }
      });
      
      return Array.from(memberMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!branchFilter,
  });

  // Group automations by phase
  const automationsByPhase = useMemo(() => {
    const map = new Map<string, typeof automations>();
    PHASES.forEach(phase => map.set(phase, []));
    
    automations?.forEach(automation => {
      const existing = map.get(automation.phase) || [];
      existing.push(automation);
      map.set(automation.phase, existing);
    });
    
    return map;
  }, [automations]);

  // Get available team members for a phase (excluding already assigned)
  const getAvailableMembers = (phase: string) => {
    const assigned = automationsByPhase.get(phase) || [];
    const assignedIds = new Set(assigned.map(a => a.team_member_id));
    return teamMembers?.filter(m => !assignedIds.has(m.id)) || [];
  };

  const handleAddMember = (phase: string, teamMemberId: string) => {
    if (teamMemberId && selectedWorkspaceId) {
      addAutomation.mutate({ phase, teamMemberId, workspaceId: selectedWorkspaceId });
    }
  };

  const handleRemoveMember = (automationId: string) => {
    removeAutomation.mutate(automationId);
  };

  const isLoading = loadingWorkspaces || loadingAutomations || loadingMembers;

  if (loadingWorkspaces) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading workspaces...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h3 className="font-medium">Phase Automation Settings</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure which team members are automatically assigned to the "People" field when a task arrives at each phase.
          These assignments happen automatically when using "Send to..." or when a task's status is set to "Done" and it moves to the next phase.
        </p>
      </div>

      {/* Workspace Tabs */}
      <Tabs
        value={selectedWorkspaceId || ''}
        onValueChange={setSelectedWorkspaceId}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 mb-6">
          {workspaces?.map((workspace) => (
            <TabsTrigger key={workspace.id} value={workspace.id}>
              {workspace.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading phase automation settings...
        </div>
      ) : (
        <div className="grid gap-4">
          {PHASES.map((phase) => {
            const phaseAutomations = automationsByPhase.get(phase) || [];
            const availableMembers = getAvailableMembers(phase);

            return (
              <div
                key={phase}
                className="border rounded-lg p-4 bg-card"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-semibold">
                      {PHASE_LABELS[phase as Phase]}
                    </Badge>
                    {phaseAutomations.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {phaseAutomations.length} member{phaseAutomations.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Assigned members */}
                  {phaseAutomations.map((automation) => (
                    <div
                      key={automation.id}
                      className="flex items-center gap-2 bg-muted/50 rounded-full pl-1 pr-2 py-1"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          style={{ backgroundColor: automation.team_member.color }}
                          className="text-white text-xs"
                        >
                          {automation.team_member.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{automation.team_member.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 hover:bg-destructive/20 hover:text-destructive"
                        onClick={() => handleRemoveMember(automation.id)}
                        disabled={removeAutomation.isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  {/* Add member dropdown */}
                  {availableMembers.length > 0 && (
                    <Select
                      onValueChange={(value) => handleAddMember(phase, value)}
                      disabled={addAutomation.isPending}
                    >
                      <SelectTrigger className="w-[180px] h-8">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Plus className="h-3 w-3" />
                          <SelectValue placeholder="Add team member" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {availableMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback
                                  style={{ backgroundColor: member.color }}
                                  className="text-white text-[10px]"
                                >
                                  {member.initials}
                                </AvatarFallback>
                              </Avatar>
                              {member.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Empty state */}
                  {phaseAutomations.length === 0 && availableMembers.length === 0 && (
                    <span className="text-sm text-muted-foreground italic">
                      No team members available for {selectedWorkspaceName}
                    </span>
                  )}

                  {phaseAutomations.length === 0 && availableMembers.length > 0 && (
                    <span className="text-sm text-muted-foreground italic">
                      No automatic assignments configured
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
