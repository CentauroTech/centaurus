
# Plan: Send Invoice PDF Email on Guest Submission

## Overview

When a guest submits an invoice, the system will automatically send an email to `Rafaelnieto@centauro.com` containing the full invoice as a PDF attachment. This will be implemented by creating a new edge function that generates a PDF using `pdf-lib` and sends it via Resend.

---

## What Will Be Built

1. **New Edge Function**: `send-invoice-email` - A dedicated function to generate a PDF invoice and send it via email
2. **Invoice PDF Generation**: Using `pdf-lib` to create a professional-looking PDF with all invoice details (vendor info, line items, totals, bank details)
3. **Automatic Triggering**: When an invoice status changes to "submitted", the system will call this edge function

---

## How It Will Work

```text
[Guest Submits Invoice]
         │
         ▼
[Invoice status → 'submitted']
         │
         ▼
[Frontend calls send-invoice-email edge function]
         │
         ├─► Fetch full invoice data (including items)
         │
         ├─► Generate PDF using pdf-lib
         │    - Invoice header with number & date
         │    - Vendor billing information
         │    - Line items table (WO#, Branch, Role, Runtime, Rate, Amount)
         │    - Totals (Subtotal, Tax, Total)
         │    - Bank details & payment instructions
         │
         └─► Send email via Resend API
              - To: Rafaelnieto@centauro.com
              - Subject: "Invoice {number} Submitted - {vendor name}"
              - PDF attached as {invoice_number}.pdf
```

---

## Implementation Steps

### 1. Create New Edge Function: `send-invoice-email`

**File**: `supabase/functions/send-invoice-email/index.ts`

- Accept invoice ID as input
- Fetch complete invoice data from database (including all line items)
- Generate PDF using `pdf-lib`:
  - A4 page format
  - Header with "INVOICE" title and invoice number
  - Invoice date and due date
  - "Bill From" section with vendor details
  - "Bill To" section with company details
  - Line items table with columns: Description, WO#, Branch, Role, Duration, Qty, Rate, Amount
  - Subtotal, tax, and total amounts
  - Bank details section
  - Notes/payment instructions
- Send email via Resend with PDF attachment
- Handle errors gracefully

### 2. Update Frontend to Call Edge Function

**File**: `src/hooks/useInvoices.ts` (modify `useSubmitInvoice`)

- After updating invoice status to 'submitted'
- Call the new `send-invoice-email` edge function with the invoice ID
- Handle success/failure gracefully (don't block the submission if email fails)

### 3. Configure Edge Function

**File**: `supabase/config.toml`

- Add configuration for the new function with `verify_jwt = false` (will validate in code)

---

## Technical Details

### PDF Generation with pdf-lib

```text
+------------------------------------------+
|  INVOICE                    INV-XX-2501-001 |
|                                             |
|  Date: January 15, 2026                     |
|  Due: February 14, 2026                     |
|                                             |
+---------------------------------------------+
|  BILL FROM            |  BILL TO            |
|  John Doe             |  Television Services|
|  123 Main St          |  6355 NW 36 St      |
|  Miami, FL, USA       |  Miami, FL 33166    |
+---------------------------------------------+
|  Description | WO#  | Branch | Role | ...   |
|  Episode 1   | A... | bogota | trad | ...   |
|  Episode 2   | B... | miami  | adap | ...   |
+---------------------------------------------+
|                          Subtotal: $500.00  |
|                          Tax (0%):   $0.00  |
|                          TOTAL:    $500.00  |
+---------------------------------------------+
|  BANK DETAILS                               |
|  Bank: Example Bank                         |
|  Account: ****1234                          |
+---------------------------------------------+
```

### Email Template

- **From**: `Centaurus <notifications@inshakafilms.com>` (existing verified domain)
- **To**: `Rafaelnieto@centauro.com`
- **Subject**: `Invoice {INV-XX-YYMM-001} Submitted - {Vendor Name}`
- **Body**: Simple HTML with summary info and note that full details are in the attached PDF
- **Attachment**: `{invoice_number}.pdf`

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/send-invoice-email/index.ts` | Create | New edge function for PDF generation and email |
| `supabase/config.toml` | Modify | Add function configuration |
| `src/hooks/useInvoices.ts` | Modify | Call edge function after invoice submission |

---

## Error Handling

- If PDF generation fails, log error but don't block invoice submission
- If email sending fails, log error but don't block invoice submission
- The in-app notification system will still work as a backup
- Console logging for debugging purposes

---

## Dependencies

- **pdf-lib**: Already available via npm import in Deno (`npm:pdf-lib`)
- **Resend**: Already configured with `RESEND_API_KEY` secret
- No new secrets required
