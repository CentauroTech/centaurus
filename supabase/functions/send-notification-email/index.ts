import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { SESClient, SendEmailCommand } from "npm:@aws-sdk/client-ses@3.758.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  notification_id: string;
  user_id: string;
  type: string;
  task_id: string | null;
  triggered_by_id: string | null;
  title: string;
  message: string | null;
}

const LOGO_URL = "https://myxsnhxorstzbrobecgw.supabase.co/storage/v1/object/public/email-assets/centauro-logo.png";
const APP_URL = "https://centaurus.lovable.app";
const FONT_STACK = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";
const HEADING_FONT = "'Poppins','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`${name} not configured`);
  return v;
}

/** Maps notification type → action verb for the title line */
function getActionVerb(type: string): string {
  switch (type) {
    case "mention": return "mentioned you";
    case "mention_everyone": return "mentioned everyone";
    case "assignment": return "assigned you";
    case "due_date_today": return "due today";
    case "overdue_alert": return "is overdue";
    case "retake_list_uploaded": return "uploaded a retake list";
    case "delivery_file_uploaded": return "uploaded a delivery file";
    case "qc_list_uploaded": return "uploaded a QC list";
    case "adapting_submitted": return "submitted adapting";
    case "translation_submitted": return "submitted translation";
    case "invoice_approved": return "approved your invoice";
    case "invoice_rejected": return "rejected your invoice";
    case "invoice_paid": return "marked your invoice as paid";
    case "invoice_submitted": return "submitted an invoice";
    case "project_delivered_to_client": return "delivered the project to the client";
    default: return "sent you a notification";
  }
}

/** Maps notification type → email subject */
function getSubject(type: string, triggeredByName: string, taskName: string): string {
  switch (type) {
    case "mention":
    case "mention_everyone":
      return `${triggeredByName} mentioned you in Centaurus`;
    case "assignment":
      return `You were assigned to "${taskName}" in Centaurus`;
    case "invoice_submitted":
      return `Invoice Submitted for Approval – Centaurus`;
    case "invoice_approved":
      return `Your Invoice Has Been Approved – Centaurus`;
    case "invoice_rejected":
      return `Your Invoice Was Rejected – Centaurus`;
    case "invoice_paid":
      return `Your Invoice Has Been Paid – Centaurus`;
    case "due_date_today":
      return `"${taskName}" is due today – Centaurus`;
    case "overdue_alert":
      return `"${taskName}" is overdue – Centaurus`;
    default:
      return `Centaurus Notification`;
  }
}

/** Maps notification type → CTA button label */
function getCtaLabel(type: string): string {
  if (type === "mention" || type === "mention_everyone") return "Reply on Centaurus";
  if (type.startsWith("invoice_")) return "View Invoice";
  return "Open in Centaurus";
}

/** Builds the unified branded HTML email */
function buildEmail(opts: {
  triggeredByName: string;
  actionVerb: string;
  boardName: string;
  taskName: string;
  contextLine: string;
  contentHtml: string;
  ctaUrl: string;
  ctaLabel: string;
  postedDate: string;
  year: number;
}): string {
  const { triggeredByName, actionVerb, boardName, taskName, contextLine, contentHtml, ctaUrl, ctaLabel, postedDate, year } = opts;

  return `<!doctype html>
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
  <img src="${LOGO_URL}" alt="Centauro" width="120" style="display:block;margin:0 auto 8px auto;">
  <div style="font-family:${HEADING_FONT};font-size:18px;font-weight:700;color:#111827;letter-spacing:0.5px;">Centaurus</div>
</td>
</tr>
<!-- Red Divider -->
<tr><td style="height:3px;background:#dc2626;"></td></tr>

<!-- Body -->
<tr>
<td style="padding:32px 32px 24px 32px;font-family:${FONT_STACK};">

  <!-- Title -->
  <div style="font-size:18px;font-weight:600;color:#111827;line-height:1.5;">
    <span style="color:#111827;">${triggeredByName}</span>
    <span style="color:#dc2626;font-weight:600;"> ${actionVerb}</span>
    ${boardName ? `on <span style="font-weight:600;">${boardName}</span>` : ""}
    ${taskName && taskName !== "a task" ? `in an update on <span style="font-weight:600;">${taskName}</span>` : ""}
  </div>

  <!-- Context Line -->
  ${contextLine ? `<div style="margin-top:8px;font-size:13px;color:#6b7280;">${contextLine}</div>` : ""}

  <!-- Content Card -->
  ${contentHtml ? `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="margin-top:24px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb;">
  <tr>
  <td style="padding:18px;font-family:${FONT_STACK};">
    <div style="font-size:12px;color:#9ca3af;margin-bottom:10px;">${postedDate}</div>
    <div style="font-size:14px;color:#111827;line-height:1.6;">
      ${contentHtml}
    </div>
  </td>
  </tr>
  </table>
  ` : ""}

  <!-- CTA -->
  <div style="margin-top:28px;text-align:left;">
    <a href="${ctaUrl}"
       style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;font-family:${FONT_STACK};">
       ${ctaLabel}
    </a>
  </div>

  <!-- Fallback link -->
  <div style="margin-top:14px;font-size:12px;color:#6b7280;">
    If the button doesn't work, copy and paste this link:<br/>
    <span style="color:#111827;">${ctaUrl}</span>
  </div>

  <!-- Footer -->
  <div style="margin-top:24px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">
    This is an automated notification from Centaurus.<br/>
    Manage preferences in Settings → Notifications.
  </div>
</td>
</tr>
</table>

<!-- Copyright -->
<div style="max-width:600px;font-family:${FONT_STACK};font-size:11px;color:#9ca3af;padding:12px 6px 0 6px;text-align:center;">
  © ${year} Centaurus
</div>
</td>
</tr>
</table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AWS_ACCESS_KEY_ID = requireEnv("AWS_ACCESS_KEY_ID");
    const AWS_SECRET_ACCESS_KEY = requireEnv("AWS_SECRET_ACCESS_KEY");
    const AWS_REGION = requireEnv("AWS_REGION");
    const SES_FROM_EMAIL = requireEnv("SES_FROM_EMAIL");

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseServiceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    console.log("Received notification payload:", payload);

    const ses = new SESClient({
      region: AWS_REGION,
      credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
    });

    // --- Get recipient ---
    const { data: recipient, error: recipientError } = await supabase
      .from("team_members")
      .select("id, name, email")
      .eq("id", payload.user_id)
      .single();

    if (recipientError || !recipient) {
      console.error("Failed to get recipient:", recipientError);
      return new Response(JSON.stringify({ error: "Recipient not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recipient.email) {
      return new Response(JSON.stringify({ skipped: true, reason: "No email configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Check email preferences ---
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("email_mentions, email_assignments")
      .eq("user_id", payload.user_id)
      .maybeSingle();

    const shouldSendEmail = preferences
      ? payload.type === "mention" || payload.type === "mention_everyone"
        ? preferences.email_mentions
        : payload.type === "assignment"
          ? preferences.email_assignments
          : true
      : true;

    if (!shouldSendEmail) {
      return new Response(JSON.stringify({ skipped: true, reason: "Email notifications disabled by user" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Get triggered-by name ---
    let triggeredByName = "Someone";
    if (payload.triggered_by_id) {
      const { data: triggeredBy } = await supabase
        .from("team_members").select("name").eq("id", payload.triggered_by_id).single();
      if (triggeredBy?.name) triggeredByName = triggeredBy.name;
    }

    // --- Get task/board/workspace info ---
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

    // --- Build CTA URL ---
    let ctaUrl = APP_URL;
    if (payload.type.startsWith("invoice_")) {
      ctaUrl = `${APP_URL}/billing`;
    } else if (payload.task_id) {
      ctaUrl = `${APP_URL}/?task=${payload.task_id}`;
    }

    // --- Clean message ---
    let cleanMessage = (payload.message ?? "").replace(/\s*invoice_id::[a-f0-9-]+/g, "").trim();
    if (cleanMessage.startsWith('"') && cleanMessage.endsWith('"')) {
      cleanMessage = cleanMessage.slice(1, -1);
    }

    // For mention emails, fetch the FULL comment from the database
    if ((payload.type === "mention" || payload.type === "mention_everyone") && payload.task_id && payload.triggered_by_id) {
      const { data: latestComment } = await supabase
        .from("comments")
        .select("content")
        .eq("task_id", payload.task_id)
        .eq("user_id", payload.triggered_by_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestComment?.content) {
        cleanMessage = latestComment.content;
      }
    }

    // --- Build email ---
    const now = new Date();
    const year = now.getFullYear();
    const postedDate = now.toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });

    const actionVerb = getActionVerb(payload.type);
    const subject = getSubject(payload.type, triggeredByName, taskName);
    const ctaLabel = getCtaLabel(payload.type);

    // Build context line
    const contextParts = [boardName, taskName !== "a task" ? taskName : ""].filter(Boolean);
    const contextLine = contextParts.join(" &gt; ");

    const htmlContent = buildEmail({
      triggeredByName,
      actionVerb,
      boardName,
      taskName,
      contextLine,
      contentHtml: cleanMessage,
      ctaUrl,
      ctaLabel,
      postedDate,
      year,
    });

    const plainText = `${payload.title}\n\n${cleanMessage.replace(/<[^>]*>/g, "")}\n\nTask: ${taskName}\nBoard: ${boardName}\nTriggered by: ${triggeredByName}\n\nOpen: ${ctaUrl}`;

    console.log("Sending SES email to:", recipient.email);

    const sendCmd = new SendEmailCommand({
      Source: `Centaurus <${SES_FROM_EMAIL}>`,
      Destination: { ToAddresses: [recipient.email] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: htmlContent, Charset: "UTF-8" },
          Text: { Data: plainText, Charset: "UTF-8" },
        },
      },
    });

    const result = await ses.send(sendCmd);
    console.log("SES send result:", result);

    return new Response(
      JSON.stringify({ success: true, messageId: result.MessageId ?? null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-notification-email (SES):", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
