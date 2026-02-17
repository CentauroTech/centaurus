import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from './usePermissions';
import { useMyRoles } from './useMyRoles';

interface FeatureSetting {
  id: string;
  feature_key: string;
  enabled: boolean;
  allowed_roles: string[];
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useFeatureSettings(featureKey: string) {
  return useQuery({
    queryKey: ['feature-settings', featureKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_settings')
        .select('*')
        .eq('feature_key', featureKey)
        .maybeSingle();

      if (error) throw error;
      return data as FeatureSetting | null;
    },
  });
}

export function useUpdateFeatureSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ featureKey, enabled, allowedRoles }: { featureKey: string; enabled: boolean; allowedRoles: string[] }) => {
      const { data: existing } = await supabase
        .from('feature_settings')
        .select('id')
        .eq('feature_key', featureKey)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('feature_settings')
          .update({ enabled, allowed_roles: allowedRoles, updated_at: new Date().toISOString() })
          .eq('feature_key', featureKey);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('feature_settings')
          .insert({ feature_key: featureKey, enabled, allowed_roles: allowedRoles });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['feature-settings', vars.featureKey] });
    },
  });
}

export function useCanAccessFeature(featureKey: string) {
  const { data: setting, isLoading: settingLoading } = useFeatureSettings(featureKey);
  const { isGod, isAdmin, role, isLoading: permLoading } = usePermissions();
  const { data: myRoles, isLoading: rolesLoading } = useMyRoles();

  const isLoading = settingLoading || permLoading || rolesLoading;

  if (isLoading) return { canAccess: false, isLoading: true, isEnabled: false };
  if (!setting?.enabled) return { canAccess: false, isLoading: false, isEnabled: false };

  // God always has access
  if (isGod) return { canAccess: true, isLoading: false, isEnabled: true };

  const allowedRoles = setting.allowed_roles || [];

  // Check if user's member type is in allowed roles
  if (role && allowedRoles.includes(role)) return { canAccess: true, isLoading: false, isEnabled: true };

  // Check if user's team_member_roles include any allowed role
  const hasMatchingRole = myRoles?.some(r => allowedRoles.includes(r.role_type)) ?? false;
  if (hasMatchingRole) return { canAccess: true, isLoading: false, isEnabled: true };

  return { canAccess: false, isLoading: false, isEnabled: true };
}
