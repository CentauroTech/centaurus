import { useMutation } from '@tanstack/react-query';
import { useCurrentTeamMember } from './useCurrentTeamMember';
import { notifyWithEmail } from '@/lib/notifyWithEmail';

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

      for (const guestId of guestIds) {
        await notifyWithEmail({
          userId: guestId,
          type: 'assignment',
          taskId,
          triggeredById: currentMember.id,
          title: 'You have been assigned a task',
          message: `You have been assigned to "${taskName}". Please review and get started.`,
        });
      }
    },
  });
}
