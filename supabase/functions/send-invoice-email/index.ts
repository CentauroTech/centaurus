import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { SESv2Client, SendEmailCommand } from "npm:@aws-sdk/client-sesv2@3.758.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} not configured`);
  return value;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US");
}

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

// ----------------------
// KEEP YOUR EXISTING PDF GENERATION FUNCTION HERE
// ----------------------

// (Use your original generateInvoicePDF function here unchanged)

serve(async (req: Request): Promise<Response> => {
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

    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoice_id);

    const pdfBytes = await generateInvoicePDF(invoice, items || []);
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

    // ----------------------
    // SES SETUP
    // ----------------------

    const ses = new SESv2Client({
      region: requireEnv("AWS_REGION"),
      credentials: {
        accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
      },
    });

    const FROM = requireEnv("SES_FROM_EMAIL");
    const TO = Deno.env.get("INVOICE_TO_EMAIL") || "rafaelnieto@centauro.com";

    const subject = `Invoice ${invoice.invoice_number} Submitted - ${invoice.billing_name}`;

    const html = `
      <h2>New Invoice Submitted</h2>
      <p><strong>Invoice:</strong> ${invoice.invoice_number}</p>
      <p><strong>Vendor:</strong> ${invoice.billing_name}</p>
      <p><strong>Total:</strong> ${formatCurrency(invoice.total_amount, invoice.currency)}</p>
      <p>See attached PDF.</p>
    `;

    const boundary = `----=_Boundary_${crypto.randomUUID()}`;

    const wrappedPdf = pdfBase64.match(/.{1,76}/g)?.join("\n") || pdfBase64;

    const rawEmail = [
      `From: Centaurus <${FROM}>`,
      `To: ${TO}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,

      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      ``,
      html,
      ``,

      `--${boundary}`,
      `Content-Type: application/pdf; name="${invoice.invoice_number}.pdf"`,
      `Content-Disposition: attachment; filename="${invoice.invoice_number}.pdf"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      wrappedPdf,
      ``,

      `--${boundary}--`,
    ].join("\r\n");

    const result = await ses.send(
      new SendEmailCommand({
        FromEmailAddress: `Centaurus <${FROM}>`,
        Destination: { ToAddresses: [TO] },
        Content: {
          Raw: {
            Data: new TextEncoder().encode(rawEmail),
          },
        },
      }),
    );

    return new Response(JSON.stringify({ success: true, messageId: result.MessageId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Invoice email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
