import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

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

async function generateInvoicePDF(
  invoice: Invoice,
  items: InvoiceItem[]
): Promise<Uint8Array> {
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

  const vendorLocation = [invoice.billing_city, invoice.billing_country]
    .filter(Boolean)
    .join(", ");
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
    const desc = item.description.length > 25 
      ? item.description.substring(0, 22) + "..." 
      : item.description;
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
      ? (item.role_performed.length > 8 ? item.role_performed.substring(0, 6) + ".." : item.role_performed)
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
      const masked = invoice.billing_bank_account.length > 4
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
      return new Response(
        JSON.stringify({ error: "invoice_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing invoice email for: ${invoice_id}`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (invoiceError || !invoice) {
      console.error("Failed to fetch invoice:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch invoice items
    const { data: items, error: itemsError } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice_id)
      .order("created_at");

    if (itemsError) {
      console.error("Failed to fetch invoice items:", itemsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch invoice items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate PDF
    console.log("Generating PDF...");
    const pdfBytes = await generateInvoicePDF(invoice as Invoice, items as InvoiceItem[]);
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

    // Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    const emailResponse = await resend.emails.send({
      from: "Centaurus <notifications@inshakafilms.com>",
      to: ["Rafaelnieto@centauro.com"],
      subject: `Invoice ${invoice.invoice_number} Submitted - ${invoice.billing_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Invoice Submitted</h2>
          <p>A new invoice has been submitted for approval.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
            <p style="margin: 5px 0;"><strong>Vendor:</strong> ${invoice.billing_name}</p>
            <p style="margin: 5px 0;"><strong>Total Amount:</strong> ${formatCurrency(invoice.total_amount, invoice.currency || "USD")}</p>
            <p style="margin: 5px 0;"><strong>Items:</strong> ${items?.length || 0}</p>
          </div>
          
          <p>Please find the complete invoice details in the attached PDF.</p>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated notification from Centaurus.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `${invoice.invoice_number}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, email_id: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-invoice-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
