import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentTeamMember } from './useCurrentTeamMember';

interface SendGuestAssignmentNotificationParams {
  taskId: string;
  taskName: string;
  guestIds: string[];
}

export function useSendGuestAssignmentNotification() {
  const { data: currentMember } = useCurrentTeamMember();

  return useMutation({
    mutationFn: async ({ taskId, taskName, guestIds }: SendGuestAssignmentNotificationParams) => {
      if (!currentMember?.id || guestIds.length === 0) return;

      // Create notifications for each guest
      const notifications = guestIds.map(guestId => ({
        user_id: guestId,
        task_id: taskId,
        triggered_by_id: currentMember.id,
        type: 'assignment',
        title: 'You have been assigned a task',
        message: `You have been assigned to "${taskName}". Please review and get started.`,
      }));

      // Insert notifications
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifyError) {
        console.error('Failed to create guest notifications:', notifyError);
        throw notifyError;
      }

      // Trigger email notifications for each guest
      for (const guestId of guestIds) {
        try {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              notification_id: crypto.randomUUID(),
              user_id: guestId,
              type: 'assignment',
              task_id: taskId,
              triggered_by_id: currentMember.id,
              title: 'You have been assigned a task',
              message: `You have been assigned to "${taskName}". Please review and get started.`,
            },
          });
        } catch (emailError) {
          console.error('Failed to send guest email notification:', emailError);
          // Don't throw - email failure shouldn't block the assignment
        }
      }
    },
  });
}
