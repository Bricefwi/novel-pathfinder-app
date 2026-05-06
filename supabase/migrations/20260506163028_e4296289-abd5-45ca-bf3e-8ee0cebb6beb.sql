UPDATE public.invoices
SET amount_paid = 204, payment_status = 'partial', updated_at = now()
WHERE invoice_number = 'FAC-2026-0008';