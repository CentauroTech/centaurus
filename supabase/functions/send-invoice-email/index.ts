import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { SESv2Client, SendEmailCommand } from "npm:@aws-sdk/client-sesv2@3.758.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InvoiceItem {
  description: string;
  work_order_number: string | null;
  branch: string | null;
  role_performed: string | null;
  runtime: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  billing_name: string;
  billing_address: string | null;
  billing_city: string | null;
  billing_country: string | null;
  billing_tax_id: string | null;
  billing_bank_name: string | null;
  billing_bank_account: string | null;
  billing_bank_routing: string | null;
  billing_notes: string | null;
  payment_instructions: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
}

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`${name} not configured`);
  return v;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

// Safer base64 encoding for Uint8Array (avoids stack/argument limits)
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000; // 32KB
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function generateInvoicePDF(invoice: Invoice, items: InvoiceItem[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  let y = height - margin;

  // Header
  page.drawText("INVOICE", {
    x: margin,
    y,
    size: 28,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(invoice.invoice_number, {
    x: width - margin - helveticaBold.widthOfTextAtSize(invoice.invoice_number, 14),
    y,
    size: 14,
    font: helveticaBold,
    color: rgb(0.3, 0.3, 0.3),
  });

  y -= 30;

  // Dates
  page.drawText(`Date: ${formatDate(invoice.invoice_date)}`, {
    x: margin,
    y,
    size: 10,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });

  if (invoice.due_date) {
    y -= 14;
    page.drawText(`Due: ${formatDate(invoice.due_date)}`, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  y -= 30;

  // Divider line
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });

  y -= 25;

  // Bill From / Bill To sections
  const colWidth = (width - margin * 2) / 2;

  page.drawText("BILL FROM", {
    x: margin,
    y,
    size: 9,
    font: helveticaBold,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText("BILL TO", {
    x: margin + colWidth,
    y,
    size: 9,
    font: helveticaBold,
    color: rgb(0.5, 0.5, 0.5),
  });

  y -= 16;

  // Vendor info
  page.drawText(invoice.billing_name, {
    x: margin,
    y,
    size: 11,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Company info
  page.drawText("Television Services", {
    x: margin + colWidth,
    y,
    size: 11,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  y -= 14;

  if (invoice.billing_address) {
    page.drawText(invoice.billing_address, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  page.drawText("6355 NW 36 St", {
    x: margin + colWidth,
    y,
    size: 10,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  });

  y -= 14;

  const vendorLocation = [invoice.billing_city, invoice.billing_country].filter(Boolean).join(", ");
  if (vendorLocation) {
    page.drawText(vendorLocation, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  page.drawText("Miami, FL 33166", {
    x: margin + colWidth,
    y,
    size: 10,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  });

  y -= 14;

  if (invoice.billing_tax_id) {
    page.drawText(`Tax ID: ${invoice.billing_tax_id}`, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 14;
  }

  y -= 20;

  // Items table header
  page.drawRectangle({
    x: margin,
    y: y - 5,
    width: width - margin * 2,
    height: 20,
    color: rgb(0.95, 0.95, 0.95),
  });

  const tableHeaders = ["Description", "WO#", "Branch", "Role", "Duration", "Rate", "Amount"];
  const colWidths = [140, 70, 55, 55, 55, 55, 70];
  let xPos = margin + 5;

  for (let i = 0; i < tableHeaders.length; i++) {
    page.drawText(tableHeaders[i], {
      x: xPos,
      y: y,
      size: 8,
      font: helveticaBold,
      color: rgb(0.4, 0.4, 0.4),
    });
    xPos += colWidths[i];
  }

  y -= 22;

  // Items
  for (const item of items) {
    if (y < 150) break; // Leave room for totals and footer

    xPos = margin + 5;

    // Description (truncate if too long)
    const desc = item.description.length > 25 ? item.description.substring(0, 22) + "..." : item.description;
    page.drawText(desc, {
      x: xPos,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    xPos += colWidths[0];

    // WO#
    page.drawText(item.work_order_number || "-", {
      x: xPos,
      y,
      size: 8,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    xPos += colWidths[1];

    // Branch
    page.drawText(item.branch || "-", {
      x: xPos,
      y,
      size: 8,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    xPos += colWidths[2];

    // Role
    const role = item.role_performed
      ? item.role_performed.length > 8
        ? item.role_performed.substring(0, 6) + ".."
        : item.role_performed
      : "-";
    page.drawText(role, {
      x: xPos,
      y,
      size: 8,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    xPos += colWidths[3];

    // Duration/Runtime
    page.drawText(item.runtime || "-", {
      x: xPos,
      y,
      size: 8,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    xPos += colWidths[4];

    // Rate
    page.drawText(formatCurrency(item.unit_price, invoice.currency), {
      x: xPos,
      y,
      size: 8,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    xPos += colWidths[5];

    // Amount
    page.drawText(formatCurrency(item.total_price, invoice.currency), {
      x: xPos,
      y,
      size: 9,
      font: helveticaBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    y -= 18;
  }

  y -= 10;

  // Divider
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });

  y -= 20;

  // Totals
  const totalsX = width - margin - 150;

  page.drawText("Subtotal:", {
    x: totalsX,
    y,
    size: 10,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText(formatCurrency(invoice.subtotal, invoice.currency), {
    x: totalsX + 80,
    y,
    size: 10,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  });

  y -= 16;

  page.drawText(`Tax (${invoice.tax_rate}%):`, {
    x: totalsX,
    y,
    size: 10,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText(formatCurrency(invoice.tax_amount, invoice.currency), {
    x: totalsX + 80,
    y,
    size: 10,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  });

  y -= 18;

  page.drawText("TOTAL:", {
    x: totalsX,
    y,
    size: 12,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText(formatCurrency(invoice.total_amount, invoice.currency), {
    x: totalsX + 80,
    y,
    size: 12,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  y -= 35;

  // Bank Details section
  if (invoice.billing_bank_name || invoice.billing_bank_account) {
    page.drawText("BANK DETAILS", {
      x: margin,
      y,
      size: 9,
      font: helveticaBold,
      color: rgb(0.5, 0.5, 0.5),
    });

    y -= 16;

    if (invoice.billing_bank_name) {
      page.drawText(`Bank: ${invoice.billing_bank_name}`, {
        x: margin,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 14;
    }

    if (invoice.billing_bank_account) {
      // Mask account number for security
      const masked =
        invoice.billing_bank_account.length > 4
          ? "****" + invoice.billing_bank_account.slice(-4)
          : invoice.billing_bank_account;
      page.drawText(`Account: ${masked}`, {
        x: margin,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 14;
    }

    if (invoice.billing_bank_routing) {
      page.drawText(`Routing: ${invoice.billing_bank_routing}`, {
        x: margin,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 14;
    }
  }

  // Notes
  if (invoice.billing_notes || invoice.payment_instructions) {
    y -= 10;
    page.drawText("NOTES", {
      x: margin,
      y,
      size: 9,
      font: helveticaBold,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 14;

    const notes = invoice.billing_notes || invoice.payment_instructions || "";
    const truncatedNotes = notes.length > 200 ? notes.substring(0, 197) + "..." : notes;
    page.drawText(truncatedNotes, {
      x: margin,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
      maxWidth: width - margin * 2,
    });
  }

  return await pdfDoc.save();
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoice_id } = await req.json();

    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing invoice email for: ${invoice_id}`);

    // Create Supabase client with service role
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseServiceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (invoiceError || !invoice) {
      console.error("Failed to fetch invoice:", invoiceError);
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch invoice items
    const { data: items, error: itemsError } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice_id)
      .order("created_at");

    if (itemsError) {
      console.error("Failed to fetch invoice items:", itemsError);
      return new Response(JSON.stringify({ error: "Failed to fetch invoice items" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate PDF
    console.log("Generating PDF...");
    const pdfBytes = await generateInvoicePDF(invoice as Invoice, (items || []) as InvoiceItem[]);
    const pdfBase64 = uint8ToBase64(pdfBytes);

    // --- Amazon SES (Raw MIME) setup ---
    const AWS_ACCESS_KEY_ID = requireEnv("AWS_ACCESS_KEY_ID");
    const AWS_SECRET_ACCESS_KEY = requireEnv("AWS_SECRET_ACCESS_KEY");
    const AWS_REGION = requireEnv("AWS_REGION"); // e.g. us-east-1
    const SES_FROM_EMAIL = requireEnv("SES_FROM_EMAIL"); // e.g. notifications@centaurus.centauro.com
    const INVOICE_TO_EMAIL = Deno.env.get("INVOICE_TO_EMAIL") || "rafaelnieto@centauro.com";

    const ses = new SESv2Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    const subject = `Invoice ${invoice.invoice_number} Submitted - ${invoice.billing_name}`;
    const now = new Date();
    const timestamp = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const year = now.getFullYear();
    const totalFormatted = formatCurrency(invoice.total_amount, invoice.currency || "USD");
    const ctaUrl = "https://centaurus.lovable.app/billing";

    const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f6f7f9;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f7f9;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e6e8eb;border-radius:12px;overflow:hidden;">
<tr><td style="padding:18px 20px;border-bottom:1px solid #eef0f3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td align="left" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;font-weight:700;">Centaurus</td>
<td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b7280;">${timestamp}</td>
</tr></table></td></tr>
<tr><td style="padding:22px 20px 8px 20px;font-family:Arial,Helvetica,sans-serif;">
<div style="font-size:16px;line-height:1.4;color:#111827;font-weight:700;margin:0 0 6px 0;">Invoice submitted</div>
<div style="font-size:13px;line-height:1.6;color:#374151;margin:0 0 14px 0;">An invoice has been submitted. The PDF is attached.</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #eef0f3;border-radius:10px;">
<tr><td style="padding:12px 12px;font-family:Arial,Helvetica,sans-serif;">
<div style="font-size:12px;color:#6b7280;line-height:1.7;">
<span style="font-weight:700;color:#111827;">Invoice:</span> ${invoice.invoice_number}<br/>
<span style="font-weight:700;color:#111827;">Vendor:</span> ${invoice.billing_name}<br/>
<span style="font-weight:700;color:#111827;">Total:</span> ${totalFormatted}<br/>
<span style="font-weight:700;color:#111827;">Items:</span> ${items?.length || 0}
</div></td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px;">
<tr><td bgcolor="#111827" style="border-radius:10px;">
<a href="${ctaUrl}" style="display:inline-block;padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Review invoice</a>
</td></tr></table>
<div style="font-size:12px;line-height:1.6;color:#6b7280;margin:14px 0 0 0;">
If the button doesn't work, copy and paste this link:<br/>
<span style="color:#111827;">${ctaUrl}</span></div>
</td></tr>
<tr><td style="padding:16px 20px;border-top:1px solid #eef0f3;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b7280;">
This is an automated message from Centaurus.</td></tr>
</table>
<div style="max-width:600px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#9ca3af;padding:12px 6px 0 6px;">
&copy; ${year} Centaurus</div>
</td></tr></table></body></html>`;

    // Wrap base64 at 76 chars/line for MIME compatibility
    const wrappedPdfBase64 = pdfBase64.match(/.{1,76}/g)?.join("\n") || pdfBase64;

    const boundary = `----=_CentaurusBoundary_${crypto.randomUUID()}`;

    const rawMime = [
      `From: Centaurus <${SES_FROM_EMAIL}>`,
      `To: ${INVOICE_TO_EMAIL}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,

      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      html,
      ``,

      `--${boundary}`,
      `Content-Type: application/pdf; name="${invoice.invoice_number}.pdf"`,
      `Content-Description: ${invoice.invoice_number}.pdf`,
      `Content-Disposition: attachment; filename="${invoice.invoice_number}.pdf";`,
      `Content-Transfer-Encoding: base64`,
      ``,
      wrappedPdfBase64,
      ``,

      `--${boundary}--`,
      ``,
    ].join("\r\n");

    console.log("Sending invoice email via SES to:", INVOICE_TO_EMAIL);

    const sesResult = await ses.send(
      new SendEmailCommand({
        FromEmailAddress: `Centaurus <${SES_FROM_EMAIL}>`,
        Destination: {
          ToAddresses: [INVOICE_TO_EMAIL],
        },
        Content: {
          Raw: {
            Data: new TextEncoder().encode(rawMime),
          },
        },
      }),
    );

    console.log("Email sent successfully (SES):", sesResult);

    return new Response(JSON.stringify({ success: true, messageId: sesResult.MessageId ?? null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-invoice-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
