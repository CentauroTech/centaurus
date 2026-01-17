-- Create a function to call the email notification edge function
CREATE OR REPLACE FUNCTION public.send_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs notification_preferences%ROWTYPE;
  v_should_email BOOLEAN := true;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = NEW.user_id;
  
  -- Check if email should be sent based on preferences
  IF v_prefs.id IS NOT NULL THEN
    IF NEW.type = 'mention' AND NOT v_prefs.email_mentions THEN
      v_should_email := false;
    ELSIF NEW.type = 'assignment' AND NOT v_prefs.email_assignments THEN
      v_should_email := false;
    END IF;
  END IF;
  
  -- If email should be sent, use pg_net to call edge function
  IF v_should_email THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'notification_id', NEW.id,
        'user_id', NEW.user_id,
        'type', NEW.type,
        'task_id', NEW.task_id,
        'triggered_by_id', NEW.triggered_by_id,
        'title', NEW.title,
        'message', NEW.message
      )
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the notification insert
    RAISE WARNING 'Failed to send email notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger to send email on notification insert
CREATE TRIGGER trigger_send_notification_email
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.send_notification_email();