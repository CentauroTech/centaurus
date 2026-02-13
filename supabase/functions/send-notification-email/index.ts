import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Deno-compatible npm import for AWS SDK v3
import { SESClient, SendEmailCommand } from "npm:@aws-sdk/client-ses@3.758.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  notification_id: string;
  user_id: string;
  type: "mention" | "assignment" | "invoice_submitted" | "invoice_approved";
  task_id: string | null;
  triggered_by_id: string | null;
  title: string;
  message: string | null;
}

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`${name} not configured`);
  return v;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Required env vars ---
    const AWS_ACCESS_KEY_ID = requireEnv("AWS_ACCESS_KEY_ID");
    const AWS_SECRET_ACCESS_KEY = requireEnv("AWS_SECRET_ACCESS_KEY");
    const AWS_REGION = requireEnv("AWS_REGION"); // e.g. "us-east-1"
    const SES_FROM_EMAIL = requireEnv("SES_FROM_EMAIL"); // e.g. "notifications@centaurus.centauro.com"

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseServiceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    console.log("Received notification payload:", payload);

    // --- SES client ---
    const ses = new SESClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    // Get recipient's email and preferences
    const { data: recipient, error: recipientError } = await supabase
      .from("team_members")
      .select("id, name, email")
      .eq("id", payload.user_id)
      .single();

    if (recipientError || !recipient) {
      console.error("Failed to get recipient:", recipientError);
      return new Response(JSON.stringify({ error: "Recipient not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recipient.email) {
      console.log("Recipient has no email configured, skipping");
      return new Response(JSON.stringify({ skipped: true, reason: "No email configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user's email preferences
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("email_mentions, email_assignments")
      .eq("user_id", payload.user_id)
      .maybeSingle();

    const shouldSendEmail = preferences
      ? payload.type === "mention"
        ? preferences.email_mentions
        : payload.type === "assignment"
          ? preferences.email_assignments
          : true // invoice_submitted and invoice_approved always send email
      : true;

    if (!shouldSendEmail) {
      console.log("User has disabled email notifications for this type");
      return new Response(
        JSON.stringify({
          skipped: true,
          reason: "Email notifications disabled by user",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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

      if (triggeredBy?.name) triggeredByName = triggeredBy.name;
    }

    // Get task name
    let taskName = "a task";
    if (payload.task_id) {
      const { data: task } = await supabase.from("tasks").select("name").eq("id", payload.task_id).single();

      if (task?.name) taskName = task.name;
    }

    // Build email subject and content
    const subject =
      payload.type === "mention"
        ? `${triggeredByName} mentioned you in Centaurus`
        : payload.type === "invoice_submitted"
          ? `Invoice Submitted for Approval - Centaurus`
          : payload.type === "invoice_approved"
            ? `Your Invoice Has Been Approved - Centaurus`
            : `You were assigned to "${taskName}" in Centaurus`;

    const htmlContent = `<!DOCTYPE html>
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
      ${payload.message ? `<p style="color: #64748b; margin-bottom: 24px;">${payload.message}</p>` : ""}
      ${
        payload.type !== "invoice_submitted"
          ? `<div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
              <p style="margin: 0; font-weight: 500;">Task: ${taskName}</p>
            </div>`
          : ""
      }
      <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
        This is an automated notification from Centaurus. You can manage your notification preferences in the app settings.
      </p>
    </div>
  </body>
</html>`;

    console.log("Sending SES email to:", recipient.email);

    const sendCmd = new SendEmailCommand({
      Source: `Centaurus <${SES_FROM_EMAIL}>`,
      Destination: { ToAddresses: [recipient.email] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: htmlContent, Charset: "UTF-8" },
          // Optional: include a text fallback to improve deliverability
          Text: {
            Data: `${payload.title}\n\n${payload.message ?? ""}\n\nTask: ${taskName}`,
            Charset: "UTF-8",
          },
        },
      },
      // Optional: direct replies somewhere else
      // ReplyToAddresses: ["rafaelnieto@centauro.com"],
    });

    const result = await ses.send(sendCmd);

    console.log("SES send result:", result);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.MessageId ?? null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-notification-email (SES):", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
