-- Add branch column to invoice_items table
ALTER TABLE public.invoice_items ADD COLUMN branch text;