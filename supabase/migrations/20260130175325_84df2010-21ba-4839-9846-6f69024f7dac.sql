-- Table de traçabilité juridique des acceptations CGU/CGV
-- Conserve un historique immuable des acceptations avec versions et preuves

CREATE TABLE public.legal_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Références
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  
  -- Informations client (snapshot au moment de l'acceptation)
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_ip TEXT,
  user_agent TEXT,
  
  -- Versions des documents acceptés
  cgu_version TEXT NOT NULL DEFAULT '1.0',
  cgv_version TEXT NOT NULL DEFAULT '1.0',
  cgu_url TEXT,
  cgv_url TEXT,
  
  -- Hash SHA256 des documents pour preuve d'intégrité
  cgu_document_hash TEXT,
  cgv_document_hash TEXT,
  
  -- Acceptations individuelles
  cgu_accepted BOOLEAN NOT NULL DEFAULT false,
  cgu_accepted_at TIMESTAMPTZ,
  cgv_accepted BOOLEAN NOT NULL DEFAULT false,
  cgv_accepted_at TIMESTAMPTZ,
  
  -- Signature électronique (optionnelle)
  signature_data TEXT,
  signature_type TEXT, -- 'electronic', 'manual', 'checkbox'
  
  -- Métadonnées
  acceptance_context TEXT, -- 'quote_validation', 'invoice_payment', 'booking_confirmation'
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour recherches rapides
CREATE INDEX idx_legal_acceptances_user_id ON public.legal_acceptances(user_id);
CREATE INDEX idx_legal_acceptances_quote_id ON public.legal_acceptances(quote_id);
CREATE INDEX idx_legal_acceptances_invoice_id ON public.legal_acceptances(invoice_id);
CREATE INDEX idx_legal_acceptances_client_email ON public.legal_acceptances(client_email);
CREATE INDEX idx_legal_acceptances_created_at ON public.legal_acceptances(created_at DESC);

-- Activer RLS
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
-- Admin peut tout voir
CREATE POLICY "Admin peut gérer les acceptations légales"
ON public.legal_acceptances
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Utilisateurs peuvent voir leurs propres acceptations
CREATE POLICY "Utilisateurs peuvent voir leurs acceptations"
ON public.legal_acceptances
FOR SELECT
USING (
  auth.uid() = user_id
  OR lower(client_email) = lower((auth.jwt() ->> 'email'))
);

-- Utilisateurs peuvent créer leurs acceptations
CREATE POLICY "Utilisateurs peuvent créer leurs acceptations"
ON public.legal_acceptances
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR lower(client_email) = lower((auth.jwt() ->> 'email'))
);

-- Trigger pour updated_at
CREATE TRIGGER update_legal_acceptances_updated_at
  BEFORE UPDATE ON public.legal_acceptances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Commentaires
COMMENT ON TABLE public.legal_acceptances IS 'Traçabilité juridique des acceptations CGU/CGV avec versions et preuves immuables';
COMMENT ON COLUMN public.legal_acceptances.cgu_document_hash IS 'Hash SHA256 du document CGU au moment de l''acceptation';
COMMENT ON COLUMN public.legal_acceptances.cgv_document_hash IS 'Hash SHA256 du document CGV au moment de l''acceptation';