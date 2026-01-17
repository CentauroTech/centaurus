import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  notification_id: string;
  user_id: string;
  type: "mention" | "assignment";
  task_id: string | null;
  triggered_by_id: string | null;
  title: string;
  message: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    console.log("Received notification payload:", payload);

    // Get recipient's email and preferences
    const { data: recipient, error: recipientError } = await supabase
      .from("team_members")
      .select("id, name, email")
      .eq("id", payload.user_id)
      .single();

    if (recipientError || !recipient) {
      console.error("Failed to get recipient:", recipientError);
      return new Response(
        JSON.stringify({ error: "Recipient not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recipient.email) {
      console.log("Recipient has no email configured, skipping");
      return new Response(
        JSON.stringify({ skipped: true, reason: "No email configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user's email preferences
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("email_mentions, email_assignments")
      .eq("user_id", payload.user_id)
      .maybeSingle();

    const shouldSendEmail = preferences
      ? (payload.type === "mention" ? preferences.email_mentions : preferences.email_assignments)
      : true; // Default to true if no preferences set

    if (!shouldSendEmail) {
      console.log("User has disabled email notifications for this type");
      return new Response(
        JSON.stringify({ skipped: true, reason: "Email notifications disabled by user" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get triggered by user's name
    let triggeredByName = "Someone";
    if (payload.triggered_by_id) {
      const { data: triggeredBy } = await supabase
        .from("team_members")
        .select("name")
        .eq("id", payload.triggered_by_id)
        .single();
      
      if (triggeredBy) {
        triggeredByName = triggeredBy.name;
      }
    }

    // Get task name
    let taskName = "a task";
    if (payload.task_id) {
      const { data: task } = await supabase
        .from("tasks")
        .select("name")
        .eq("id", payload.task_id)
        .single();
      
      if (task) {
        taskName = task.name || "a task";
      }
    }

    // Build email subject and content
    const subject = payload.type === "mention"
      ? `${triggeredByName} mentioned you in Centaurus`
      : `You were assigned to "${taskName}" in Centaurus`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Centaurus</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="color: #1e293b; margin-top: 0;">${payload.title}</h2>
            ${payload.message ? `<p style="color: #64748b; margin-bottom: 24px;">${payload.message}</p>` : ''}
            <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
              <p style="margin: 0; font-weight: 500;">Task: ${taskName}</p>
            </div>
            <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
              This is an automated notification from Centaurus. You can manage your notification preferences in the app settings.
            </p>
          </div>
        </body>
      </html>
    `;

    console.log("Sending email to:", recipient.email);

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: "Centaurus <notifications@inshakafilms.com>",
      to: [recipient.email],
      subject,
      html: htmlContent,
    });

    if (emailError) {
      console.error("Failed to send email:", emailError);
      return new Response(
        JSON.stringify({ error: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-notification-email:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
