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

    // Get task name, board name, and workspace name
    let taskName = "a task";
    let boardName = "";
    let workspaceName = "";
    if (payload.task_id) {
      const { data: task } = await supabase
        .from("tasks")
        .select("name, group:task_groups!inner(board:boards!inner(name, workspace:workspaces!inner(name)))")
        .eq("id", payload.task_id)
        .single();

      if (task?.name) taskName = task.name;
      if ((task as any)?.group?.board?.name) boardName = (task as any).group.board.name;
      if ((task as any)?.group?.board?.workspace?.name) workspaceName = (task as any).group.board.workspace.name;
    }

    // Build CTA URL
    const appUrl = "https://centaurus.lovable.app";
    let ctaUrl = appUrl;
    if (payload.type.startsWith("invoice_")) {
      ctaUrl = `${appUrl}/billing`;
    } else if (payload.task_id) {
      ctaUrl = `${appUrl}/?task=${payload.task_id}`;
    }

    // Build email subject
    const subject =
      payload.type === "mention"
        ? `${triggeredByName} mentioned you in Centaurus`
        : payload.type === "invoice_submitted"
          ? `Invoice Submitted for Approval - Centaurus`
          : payload.type === "invoice_approved"
            ? `Your Invoice Has Been Approved - Centaurus`
            : `You were assigned to "${taskName}" in Centaurus`;

    // Format timestamp
    const now = new Date();
    const timestamp = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const year = now.getFullYear();

    // Clean message: strip invoice_id metadata tags and unwrap surrounding quotes
    let cleanMessage = (payload.message ?? "").replace(/\s*invoice_id::[a-f0-9-]+/g, "").trim();
    // Remove wrapping double-quotes if present (payload sometimes arrives as '"<p>...</p>"')
    if (cleanMessage.startsWith('"') && cleanMessage.endsWith('"')) {
      cleanMessage = cleanMessage.slice(1, -1);
    }

    let htmlContent: string;

    if (payload.type === "mention") {
      // Mention template
      const postedDate = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
      htmlContent = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Centaurus Notification</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
<tr>
<td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0"
  style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">

<!-- Header: Logo + Name -->
<tr>
<td align="center" style="padding:28px 24px 20px 24px;background:#ffffff;">
  <img src="https://myxsnhxorstzbrobecgw.supabase.co/storage/v1/object/public/email-assets/centauro-logo.png" alt="Centauro" width="120" style="display:block;margin:0 auto 8px auto;">
  <div style="font-family:'Poppins','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:18px;font-weight:700;color:#111827;letter-spacing:0.5px;">Centaurus</div>
</td>
</tr>
<!-- Red Divider -->
<tr><td style="height:3px;background:#dc2626;"></td></tr>

<!-- Body -->
<tr>
<td style="padding:32px 32px 24px 32px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">

  <!-- Title -->
  <div style="font-size:18px;font-weight:600;color:#111827;line-height:1.5;">
    <span style="color:#111827;">${triggeredByName}</span>
    <span style="color:#dc2626;font-weight:600;"> mentioned you</span>
    on <span style="font-weight:600;">${boardName || "a board"}</span>
    in an update on <span style="font-weight:600;">${taskName}</span>
  </div>

  <!-- Context Line -->
  <div style="margin-top:8px;font-size:13px;color:#6b7280;">
    ${boardName || ""}${boardName && taskName ? " &gt; " : ""}${taskName}
  </div>

  <!-- Comment Card -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="margin-top:24px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb;">
  <tr>
  <td style="padding:18px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <!-- Posted date -->
    <div style="font-size:12px;color:#9ca3af;margin-bottom:10px;">${postedDate}</div>
    <!-- Comment content with clickable links -->
    <div style="font-size:14px;color:#111827;line-height:1.6;">
      ${cleanMessage}
    </div>
  </td>
  </tr>
  </table>

  <!-- CTA -->
  <div style="margin-top:28px;text-align:left;">
    <a href="${ctaUrl}"
       style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
       Reply on Centaurus
    </a>
  </div>

  <!-- Footer -->
  <div style="margin-top:24px;font-size:12px;color:#9ca3af;">
    This is an automated notification from Centaurus.
  </div>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
    } else {
      // Default template for assignment, invoice, etc.
      // Build meta box rows
      const metaRows: string[] = [];
      if (payload.type !== "invoice_submitted") {
        metaRows.push(`<span style="font-weight:700;color:#111827;">Task:</span> ${taskName}`);
      }
      if (boardName) {
        metaRows.push(`<span style="font-weight:700;color:#111827;">Board/Phase:</span> ${boardName}`);
      }
      metaRows.push(`<span style="font-weight:700;color:#111827;">Triggered by:</span> ${triggeredByName}`);

      const metaBox = metaRows.length > 0
        ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #eef0f3;border-radius:10px;">
            <tr><td style="padding:12px 12px;font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12px;color:#6b7280;line-height:1.6;">${metaRows.join("<br/>")}</div>
            </td></tr>
          </table>`
        : "";

      htmlContent = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="x-apple-disable-message-reformatting"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f6f7f9;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f7f9;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e6e8eb;border-radius:12px;overflow:hidden;">
<tr><td align="center" style="padding:20px 20px 16px 20px;border-bottom:1px solid #eef0f3;">
<img src="https://myxsnhxorstzbrobecgw.supabase.co/storage/v1/object/public/email-assets/centauro-logo.png" alt="Centauro" width="100" style="display:block;margin:0 auto 6px auto;">
<div style="font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#111827;">Centaurus</div>
</td></tr>
<tr><td style="height:3px;background:#dc2626;"></td></tr>
<tr><td style="padding:22px 20px 8px 20px;font-family:Arial,Helvetica,sans-serif;">
<div style="font-size:16px;line-height:1.4;color:#111827;font-weight:700;margin:0 0 6px 0;">${payload.title}</div>
${cleanMessage ? `<div style="font-size:13px;line-height:1.6;color:#374151;margin:0 0 14px 0;">${cleanMessage}</div>` : ""}
${metaBox}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr>
<td bgcolor="#111827" style="border-radius:10px;">
<a href="${ctaUrl}" style="display:inline-block;padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Open in Centaurus</a>
</td></tr></table>
<div style="font-size:12px;line-height:1.6;color:#6b7280;margin:14px 0 0 0;">If the button doesn't work, copy and paste this link:<br/><span style="color:#111827;">${ctaUrl}</span></div>
</td></tr>
<tr><td style="padding:16px 20px;border-top:1px solid #eef0f3;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b7280;">
You're receiving this email because notifications are enabled for your account. Manage preferences in <span style="color:#111827;">Settings → Notifications</span>.
</td></tr>
</table>
<div style="max-width:600px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#9ca3af;padding:12px 6px 0 6px;">© ${year} Centaurus</div>
</td></tr></table>
</body></html>`;
    }

    console.log("Sending SES email to:", recipient.email);

    const sendCmd = new SendEmailCommand({
      Source: `Centaurus <${SES_FROM_EMAIL}>`,
      Destination: { ToAddresses: [recipient.email] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: htmlContent, Charset: "UTF-8" },
          Text: {
            Data: `${payload.title}\n\n${cleanMessage}\n\nTask: ${taskName}\nBoard: ${boardName}\nTriggered by: ${triggeredByName}\n\nOpen: ${ctaUrl}`,
            Charset: "UTF-8",
          },
        },
      },
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
