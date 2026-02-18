
-- Add Stripe tracking columns to invoices
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS stripe_session_id text,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Add Stripe tracking columns to quotes
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS stripe_session_id text,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Create payments table for tracking all Stripe payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid REFERENCES public.invoices(id),
  quote_id uuid REFERENCES public.quotes(id),
  user_id uuid,
  stripe_session_id text,
  stripe_payment_intent_id text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'eur',
  payment_type text NOT NULL DEFAULT 'full', -- 'full', 'deposit', 'balance'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  client_name text,
  client_email text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage payments"
ON public.payments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can see their own payments
CREATE POLICY "Users can view their own payments"
ON public.payments FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Service role can insert (for webhook)
CREATE POLICY "Service role can insert payments"
ON public.payments FOR INSERT
WITH CHECK (true);
