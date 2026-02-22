import { supabase } from '@/integrations/supabase/client';

interface NotifyParams {
  userId: string;
  type: string;
  taskId: string | null;
  triggeredById: string;
  title: string;
  message?: string;
}

/**
 * Creates an in-app notification via RPC AND fires the email edge function.
 * Since pg_net is unavailable, the DB trigger can't send emails,
 * so we always invoke the edge function from the client.
 */
export async function notifyWithEmail(params: NotifyParams): Promise<void> {
  const { userId, type, taskId, triggeredById, title, message } = params;

  // 1. Create in-app notification
  try {
    await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: type,
      p_task_id: taskId,
      p_triggered_by_id: triggeredById,
      p_title: title,
      p_message: message ?? null,
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }

  // 2. Fire email (fire-and-forget)
  try {
    await supabase.functions.invoke('send-notification-email', {
      body: {
        notification_id: crypto.randomUUID(),
        user_id: userId,
        type,
        task_id: taskId,
        triggered_by_id: triggeredById,
        title,
        message: message ?? null,
      },
    });
  } catch (err) {
    console.error('Failed to send notification email:', err);
  }
}
