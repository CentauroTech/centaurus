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

  const role = (teamMember?.role as UserRole) || null;
  const isAdmin = role === 'admin';
  const isProjectManager = role === 'project_manager' || isAdmin;

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
    // All team members can do these
    canEditTasks: true,
    canMoveTasks: true,
  };
}
