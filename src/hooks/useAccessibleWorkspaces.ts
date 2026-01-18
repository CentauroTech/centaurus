import { useMemo } from 'react';
import { useWorkspaces, WorkspaceWithBoards } from './useWorkspaces';
import { useTeamMemberBranches, Branch } from './useTeamMemberBranches';
import { useCurrentTeamMember } from './useCurrentTeamMember';
import { usePermissions } from './usePermissions';

// Mapping between branch names and workspace names
const BRANCH_TO_WORKSPACE: Record<string, string> = {
  'Colombia': 'Colombia',
  'Miami': 'Miami',
  'Brazil': 'Brazil',
  'Mexico': 'Mexico',
};

/**
 * Returns workspaces filtered based on the current user's assigned branches.
 * - God and Admin users can see all workspaces
 * - Team members with multiple branches can see all those workspaces
 * - Team members with a single branch can only see that workspace
 */
export function useAccessibleWorkspaces() {
  const { data: workspaces, isLoading: workspacesLoading, error: workspacesError } = useWorkspaces();
  const { data: branches, isLoading: branchesLoading } = useTeamMemberBranches();
  const { data: currentMember, isLoading: memberLoading } = useCurrentTeamMember();
  const { isGod, isAdmin } = usePermissions();

  // Build branches map
  const branchesMap = useMemo(() => {
    const map = new Map<string, Branch[]>();
    branches?.forEach((b) => {
      const existing = map.get(b.team_member_id) || [];
      map.set(b.team_member_id, [...existing, b.branch as Branch]);
    });
    return map;
  }, [branches]);

  const accessibleWorkspaces = useMemo((): WorkspaceWithBoards[] => {
    if (!workspaces) return [];
    
    // God and Admin can see all workspaces
    if (isGod || isAdmin) {
      return workspaces;
    }

    // If no current member found, show no workspaces
    if (!currentMember) {
      return [];
    }

    // Get the user's branches
    const userBranches = branchesMap.get(currentMember.id) || [];

    // If user has no branches assigned, they can't see any workspace
    if (userBranches.length === 0) {
      return [];
    }

    // Map branches to workspace names
    const accessibleWorkspaceNames = userBranches.map(
      (branch) => BRANCH_TO_WORKSPACE[branch]
    ).filter(Boolean);

    // Filter workspaces to only show those the user has access to
    // Note: System workspaces (like Admin) are handled by RLS and not visible to regular members
    return workspaces.filter((ws) => 
      accessibleWorkspaceNames.includes(ws.name)
    );
  }, [workspaces, branchesMap, currentMember, isGod, isAdmin]);

  return {
    data: accessibleWorkspaces,
    isLoading: workspacesLoading || branchesLoading || memberLoading,
    error: workspacesError,
  };
}
