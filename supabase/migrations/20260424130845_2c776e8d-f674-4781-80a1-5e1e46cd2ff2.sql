-- Journal d'audit des tentatives d'envoi de liens de paiement
CREATE TABLE public.payment_link_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Qui
  performed_by UUID,
  performed_by_email TEXT,
  
  -- Quoi (contexte devis/facture)
  quote_id UUID,
  invoice_id UUID,
  client_email TEXT,
  client_name TEXT,
  
  -- Type de paiement
  payment_option TEXT NOT NULL, -- 'full' | 'deposit' | 'installments' | 'manual'
  installment_number INTEGER,   -- 1, 2 ou 3 si versement échelonné
  total_installments INTEGER,
  
  -- Montant
  requested_amount NUMERIC,
  expected_amount NUMERIC,
  amount_match BOOLEAN,         -- true si requested = expected
  
  -- Résultat
  action TEXT NOT NULL,         -- 'link_created' | 'link_resent' | 'blocked_duplicate' | 'blocked_already_paid' | 'blocked_amount_mismatch' | 'blocked_wrong_option' | 'failed'
  status TEXT NOT NULL,         -- 'success' | 'blocked' | 'error'
  error_message TEXT,
  
  -- Lien généré
  payment_link_url TEXT,
  stripe_session_id TEXT,
  
  -- Contexte technique
  source TEXT DEFAULT 'admin_ui', -- 'admin_ui' | 'webhook' | 'automation'
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_payment_link_audit_quote_id ON public.payment_link_audit(quote_id);
CREATE INDEX idx_payment_link_audit_invoice_id ON public.payment_link_audit(invoice_id);
CREATE INDEX idx_payment_link_audit_client_email ON public.payment_link_audit(client_email);
CREATE INDEX idx_payment_link_audit_created_at ON public.payment_link_audit(created_at DESC);
CREATE INDEX idx_payment_link_audit_status ON public.payment_link_audit(status);

-- RLS
ALTER TABLE public.payment_link_audit ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent consulter
CREATE POLICY "Admins peuvent voir le journal d'audit paiement"
ON public.payment_link_audit
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role et admins peuvent insérer (les edge functions tracent l'audit)
CREATE POLICY "Service role et admins peuvent insérer dans le journal"
ON public.payment_link_audit
FOR INSERT
WITH CHECK (true);

-- Personne ne peut modifier ou supprimer (immuabilité du journal)
-- Pas de policy UPDATE/DELETE = bloqué par défaut