CREATE TABLE public.apology_email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  sender_name TEXT,
  message_length INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  performed_by UUID,
  performed_by_email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.apology_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view apology email log"
ON public.apology_email_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert apology email log"
ON public.apology_email_log
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR auth.role() = 'service_role');

CREATE INDEX idx_apology_email_log_created_at ON public.apology_email_log(created_at DESC);
CREATE INDEX idx_apology_email_log_recipient ON public.apology_email_log(recipient);