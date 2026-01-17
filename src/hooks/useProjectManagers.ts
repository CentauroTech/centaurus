import { useTeamMembers } from './useWorkspaces';

// Only these people can be assigned as Project Manager
const APPROVED_PROJECT_MANAGER_NAMES = [
  'ana otto',
  'william rozo',
  'jill martinez',
  'julio neri',
  'cristiano ronaldo', // Test user exception
];

export function useProjectManagers() {
  const { data: teamMembers = [], ...rest } = useTeamMembers();
  
  const projectManagers = teamMembers.filter(member =>
    APPROVED_PROJECT_MANAGER_NAMES.includes(member.name.toLowerCase())
  );
  
  return { data: projectManagers, ...rest };
}

// Export the list for use in other components
export { APPROVED_PROJECT_MANAGER_NAMES };
