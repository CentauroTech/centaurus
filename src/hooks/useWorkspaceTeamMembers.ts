import { useMemo } from 'react';
import { useTeamMembers } from './useWorkspaces';
import { useTeamMemberBranches, Branch } from './useTeamMemberBranches';

// Mapping between workspace names and branch names
const WORKSPACE_TO_BRANCH: Record<string, Branch> = {
  'Colombia': 'Colombia',
  'Miami': 'Miami',
  'Brazil': 'Brazil',
  'Mexico': 'Mexico',
};

/**
 * Returns team members that belong to a specific workspace based on their branch assignments.
 * Used for @everyone mentions to notify all team members in a workspace.
 */
export function useWorkspaceTeamMembers(workspaceName: string | undefined) {
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: branches = [] } = useTeamMemberBranches();

  // Build a map of team_member_id -> branches
  const branchesMap = useMemo(() => {
    const map = new Map<string, Branch[]>();
    branches.forEach((b) => {
      const existing = map.get(b.team_member_id) || [];
      map.set(b.team_member_id, [...existing, b.branch as Branch]);
    });
    return map;
  }, [branches]);

  // Filter team members by workspace branch
  const workspaceTeamMembers = useMemo(() => {
    if (!workspaceName) return [];
    
    const targetBranch = WORKSPACE_TO_BRANCH[workspaceName];
    if (!targetBranch) return [];

    return teamMembers.filter((member) => {
      const memberBranches = branchesMap.get(member.id) || [];
      return memberBranches.includes(targetBranch);
    });
  }, [teamMembers, branchesMap, workspaceName]);

  return workspaceTeamMembers;
}
