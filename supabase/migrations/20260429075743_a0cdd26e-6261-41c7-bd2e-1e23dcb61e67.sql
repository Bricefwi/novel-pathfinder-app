-- Ajout colonnes annulation sur quotes
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_email_sent boolean DEFAULT false;

-- Index pour détection doublons
CREATE INDEX IF NOT EXISTS idx_quotes_email_activity_recent
  ON public.quotes (client_email, activity_id, created_at DESC)
  WHERE status NOT IN ('cancelled', 'rejected', 'expired');

-- Table de log d'annulation
CREATE TABLE IF NOT EXISTS public.quote_cancellation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  quote_number text NOT NULL,
  client_email text NOT NULL,
  client_name text,
  reason text,
  cancelled_by uuid,
  cancelled_by_email text,
  email_sent boolean DEFAULT false,
  email_error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_cancellation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cancellation log"
  ON public.quote_cancellation_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins and service role can insert cancellation log"
  ON public.quote_cancellation_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_quote_cancellation_log_quote ON public.quote_cancellation_log(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_cancellation_log_created ON public.quote_cancellation_log(created_at DESC);