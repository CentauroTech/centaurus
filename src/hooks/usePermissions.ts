import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Task, TEAM_MEMBER_EDITABLE_COLUMNS } from '@/types/board';

// New member types: god, admin, team_member, guest
export type MemberType = 'god' | 'admin' | 'team_member' | 'guest';

// Keep UserRole for backward compatibility (maps to MemberType)
export type UserRole = MemberType | 'project_manager' | 'member';

interface Permissions {
  isGod: boolean;
  isAdmin: boolean;
  isProjectManager: boolean;
  isTeamMember: boolean;
  isGuest: boolean;
  canEditColumns: boolean;
  canReorderColumns: boolean;
  canCreateGroups: boolean;
  canDeleteGroups: boolean;
  canEditTasks: boolean;
  canMoveTasks: boolean;
  canDeleteTasks: boolean;
  canManageTeamMembers: boolean;
  canViewAllColumns: boolean;
  role: MemberType | null;
  isLoading: boolean;
  // Column-level permission check
  canEditColumn: (columnId: string, task: Task, currentTeamMemberId?: string) => boolean;
}

export function usePermissions(): Permissions {
  const { user } = useAuth();

  const { data: teamMember, isLoading } = useQuery({
    queryKey: ['team-member-role', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;

      const { data, error } = await supabase
        .from('team_members')
        .select('id, role')
        .eq('email', user.email.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });

  // Map old roles to new types for backward compatibility
  const dbRole = teamMember?.role as string | null;
  let mappedRole: MemberType | null = null;
  
  if (dbRole === 'god') mappedRole = 'god';
  else if (dbRole === 'admin' || dbRole === 'project_manager') mappedRole = 'admin';
  else if (dbRole === 'team_member' || dbRole === 'member') mappedRole = 'team_member';
  else if (dbRole === 'guest') mappedRole = 'guest';
  else if (dbRole) mappedRole = 'team_member'; // Default to team_member for unknown roles
  
  // Role is determined by the database role column, not email domain
  const role: MemberType | null = mappedRole;
  
  const isGod = role === 'god';
  const isAdmin = role === 'admin' || isGod;
  const isTeamMember = role === 'team_member';
  const isGuest = role === 'guest';
  
  // For backward compatibility
  const isProjectManager = isGod || isAdmin;

  // Column-level permission checker
  const canEditColumn = (columnId: string, task: Task, currentTeamMemberId?: string): boolean => {
    // Guests can never edit
    if (isGuest) return false;
    
    // God and Admin can always edit all columns
    if (isGod || isAdmin) return true;
    
    // Check if task is past kickoff phase
    const isPostKickoff = task.fase && task.fase !== 'on_hold' && task.fase !== 'kickoff';
    
    // If still in kickoff or on_hold, all team members can edit
    if (!isPostKickoff) return true;
    
    // After kickoff, check if user is the assigned Project Manager
    const taskPmId = task.projectManager?.id;
    if (currentTeamMemberId && taskPmId === currentTeamMemberId) {
      return true; // PM can edit all columns on their tasks
    }
    
    // Team member (not PM) can only edit specific columns after kickoff
    return TEAM_MEMBER_EDITABLE_COLUMNS.includes(columnId);
  };

  return {
    isGod,
    isAdmin,
    isProjectManager,
    isTeamMember,
    isGuest,
    role,
    isLoading,
    // God-only actions (structural changes)
    canEditColumns: isGod,
    canReorderColumns: isGod,
    canDeleteGroups: isGod,
    canManageTeamMembers: isGod || isAdmin,
    // God + Admin actions
    canCreateGroups: isGod || isAdmin,
    canDeleteTasks: isGod || isAdmin,
    // God + Admin can view all columns, team_member respects visibility settings
    canViewAllColumns: isGod || isAdmin,
    // All centauro members (god, admin, team_member) can edit/move tasks
    canEditTasks: !isGuest,
    canMoveTasks: !isGuest,
    // Column-level permission check
    canEditColumn,
  };
}
