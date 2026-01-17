import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'project_manager' | 'member' | 'guest';

interface Permissions {
  isAdmin: boolean;
  isProjectManager: boolean;
  canEditColumns: boolean;
  canReorderColumns: boolean;
  canCreateGroups: boolean;
  canDeleteGroups: boolean;
  canEditTasks: boolean;
  canMoveTasks: boolean;
  canDeleteTasks: boolean;
  canManageTeamMembers: boolean;
  role: UserRole | null;
  isLoading: boolean;
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

  // Check if user has @centauro.com email - only they are full team members
  const isCentauroEmail = user?.email?.toLowerCase().endsWith('@centauro.com') ?? false;
  
  // Non-centauro emails are always treated as guests, regardless of role column
  const isGuest = !isCentauroEmail;
  
  const dbRole = (teamMember?.role as UserRole) || null;
  // Override role to 'guest' if not a centauro email
  const role: UserRole | null = isGuest ? 'guest' : dbRole;
  
  const isAdmin = !isGuest && dbRole === 'admin';
  const isProjectManager = !isGuest && (dbRole === 'project_manager' || isAdmin);

  return {
    isAdmin,
    isProjectManager,
    role,
    isLoading,
    // Admin-only actions
    canEditColumns: isAdmin,
    canReorderColumns: isAdmin,
    canCreateGroups: isAdmin || isProjectManager,
    canDeleteGroups: isAdmin,
    canManageTeamMembers: isAdmin,
    // Project manager + admin actions
    canDeleteTasks: isProjectManager,
    // Only centauro members can freely edit/move tasks
    canEditTasks: !isGuest,
    canMoveTasks: !isGuest,
  };
}
