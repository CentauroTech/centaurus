import { useTeamMembers } from './useWorkspaces';
import { useTeamMemberRoles } from './useTeamMemberRoles';

export function useProjectManagers() {
  const { data: teamMembers = [], ...rest } = useTeamMembers();
  const { data: roles = [] } = useTeamMemberRoles();

  // Get IDs of team members who have the 'project_manager' role
  const pmIds = new Set(
    roles
      .filter(r => r.role_type === 'project_manager')
      .map(r => r.team_member_id)
  );

  const projectManagers = teamMembers.filter(member => pmIds.has(member.id));

  return { data: projectManagers, ...rest };
}
