import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useFeatureSettings, useUpdateFeatureSetting } from '@/hooks/useFeatureSettings';
import { ROLE_TYPES, ROLE_LABELS } from '@/hooks/useTeamMemberRoles';
import { toast } from 'sonner';
import { Loader2, Shield } from 'lucide-react';

const MEMBER_TYPES_OPTIONS = [
  { value: 'god', label: 'God' },
  { value: 'admin', label: 'Admin' },
  { value: 'team_member', label: 'Team Member' },
];

export function FeatureSettingsTab() {
  const { data: setting, isLoading } = useFeatureSettings('linguistic_control_center');
  const updateMutation = useUpdateFeatureSetting();

  const [enabled, setEnabled] = useState(false);
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);

  useEffect(() => {
    if (setting) {
      setEnabled(setting.enabled);
      setAllowedRoles(setting.allowed_roles || []);
    }
  }, [setting]);

  const toggleRole = (role: string) => {
    setAllowedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        featureKey: 'linguistic_control_center',
        enabled,
        allowedRoles,
      });
      toast.success('Feature settings saved');
    } catch {
      toast.error('Failed to save');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-xl">
      {/* Linguistic Control Center */}
      <div className="border rounded-lg p-6 space-y-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-base">Linguistic Control Center</h3>
            <p className="text-sm text-muted-foreground mt-1">
              A dashboard for managing Translation & Adapting phases with AI-powered insights.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <div className="space-y-4 pl-8 border-l-2 border-primary/20 ml-2">
            <div>
              <Label className="text-sm font-medium">Allowed Member Types</Label>
              <div className="grid gap-2 mt-2">
                {MEMBER_TYPES_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={allowedRoles.includes(opt.value)}
                      onCheckedChange={() => toggleRole(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Allowed Team Roles</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {ROLE_TYPES.map(role => (
                  <label key={role} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={allowedRoles.includes(role)}
                      onCheckedChange={() => toggleRole(role)}
                    />
                    {ROLE_LABELS[role]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateMutation.isPending} size="sm">
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
