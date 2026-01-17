import { Bell, Mail, AtSign, UserPlus, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  useNotificationPreferences, 
  useUpdateNotificationPreferences 
} from '@/hooks/useNotificationPreferences';
import { toast } from 'sonner';

interface NotificationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationSettings({ open, onOpenChange }: NotificationSettingsProps) {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
      toast.success('Preferences updated');
    } catch (error) {
      toast.error('Failed to update preferences');
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notification Preferences</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Bell Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bell className="w-4 h-4" />
              <span>In-App Notifications</span>
            </div>
            
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AtSign className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="bell-mentions" className="text-sm font-normal">
                    When someone mentions me
                  </Label>
                </div>
                <Switch
                  id="bell-mentions"
                  checked={preferences?.bell_mentions ?? true}
                  onCheckedChange={(checked) => handleToggle('bell_mentions', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="bell-assignments" className="text-sm font-normal">
                    When I'm assigned to a task
                  </Label>
                </div>
                <Switch
                  id="bell-assignments"
                  checked={preferences?.bell_assignments ?? true}
                  onCheckedChange={(checked) => handleToggle('bell_assignments', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Email Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="w-4 h-4" />
              <span>Email Notifications</span>
            </div>
            
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AtSign className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="email-mentions" className="text-sm font-normal">
                    When someone mentions me
                  </Label>
                </div>
                <Switch
                  id="email-mentions"
                  checked={preferences?.email_mentions ?? true}
                  onCheckedChange={(checked) => handleToggle('email_mentions', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="email-assignments" className="text-sm font-normal">
                    When I'm assigned to a task
                  </Label>
                </div>
                <Switch
                  id="email-assignments"
                  checked={preferences?.email_assignments ?? true}
                  onCheckedChange={(checked) => handleToggle('email_assignments', checked)}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
