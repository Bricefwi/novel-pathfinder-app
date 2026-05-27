
-- ============================================================
-- VAGUE 1 — Préparation Facturation Électronique (réforme 2026)
-- ============================================================

-- 1. Enrichissement des devis (quotes)
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS client_type text NOT NULL DEFAULT 'particulier'
    CHECK (client_type IN ('particulier', 'professionnel')),
  ADD COLUMN IF NOT EXISTS client_siren text,
  ADD COLUMN IF NOT EXISTS client_vat_number text,
  ADD COLUMN IF NOT EXISTS client_company_name text,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS operation_nature text NOT NULL DEFAULT 'service'
    CHECK (operation_nature IN ('bien', 'service', 'mixte')),
  ADD COLUMN IF NOT EXISTS vat_on_debit_option boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS efacture_status text
    CHECK (efacture_status IN ('not_applicable','pending','deposited','rejected','refused','paid','cashed') OR efacture_status IS NULL),
  ADD COLUMN IF NOT EXISTS efacture_pa_id text,
  ADD COLUMN IF NOT EXISTS efacture_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS efacture_xml_url text;

-- 2. Enrichissement des factures (invoices) — mêmes champs
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS client_type text NOT NULL DEFAULT 'particulier'
    CHECK (client_type IN ('particulier', 'professionnel')),
  ADD COLUMN IF NOT EXISTS client_siren text,
  ADD COLUMN IF NOT EXISTS client_vat_number text,
  ADD COLUMN IF NOT EXISTS client_company_name text,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS operation_nature text NOT NULL DEFAULT 'service'
    CHECK (operation_nature IN ('bien', 'service', 'mixte')),
  ADD COLUMN IF NOT EXISTS vat_on_debit_option boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS efacture_status text
    CHECK (efacture_status IN ('not_applicable','pending','deposited','rejected','refused','paid','cashed') OR efacture_status IS NULL),
  ADD COLUMN IF NOT EXISTS efacture_pa_id text,
  ADD COLUMN IF NOT EXISTS efacture_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS efacture_xml_url text,
  ADD COLUMN IF NOT EXISTS efacture_pdf_url text;

CREATE INDEX IF NOT EXISTS idx_quotes_efacture_status ON public.quotes(efacture_status) WHERE efacture_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_efacture_status ON public.invoices(efacture_status) WHERE efacture_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_client_siren ON public.quotes(client_siren) WHERE client_siren IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_client_siren ON public.invoices(client_siren) WHERE client_siren IS NOT NULL;

-- 3. Table « Factures reçues » (réception fournisseurs, oblig. 09/2026)
CREATE TABLE IF NOT EXISTS public.inbound_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL,
  supplier_siren text,
  supplier_vat_number text,
  supplier_email text,
  invoice_number text NOT NULL,
  invoice_date date,
  due_date date,
  currency text NOT NULL DEFAULT 'EUR',
  total_ht numeric(12,2),
  total_tva numeric(12,2),
  total_ttc numeric(12,2) NOT NULL,
  format text NOT NULL DEFAULT 'pdf'
    CHECK (format IN ('pdf','factur-x','ubl','cii')),
  pdf_url text,
  xml_url text,
  raw_metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','validated','disputed','paid','archived')),
  received_via text NOT NULL DEFAULT 'manual'
    CHECK (received_via IN ('manual','pa_webhook','email')),
  pa_id text,
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbound_invoices TO authenticated;
GRANT ALL ON public.inbound_invoices TO service_role;

ALTER TABLE public.inbound_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gèrent les factures reçues"
  ON public.inbound_invoices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role insère factures reçues"
  ON public.inbound_invoices FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_inbound_invoices_updated_at
  BEFORE UPDATE ON public.inbound_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_inbound_invoices_status ON public.inbound_invoices(status);
CREATE INDEX IF NOT EXISTS idx_inbound_invoices_received_at ON public.inbound_invoices(created_at DESC);

-- 4. Journal e-facture (audit cycle de vie statuts PA)
CREATE TABLE IF NOT EXISTS public.efacture_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid,
  quote_id uuid,
  inbound_invoice_id uuid,
  direction text NOT NULL CHECK (direction IN ('outbound','inbound')),
  event_type text NOT NULL
    CHECK (event_type IN ('submitted','deposited','rejected','refused','accepted','paid','cashed','status_update','error')),
  status_value text,
  pa_provider text,
  pa_event_id text,
  payload jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.efacture_events TO authenticated;
GRANT ALL ON public.efacture_events TO service_role;

ALTER TABLE public.efacture_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins consultent le journal e-facture"
  ON public.efacture_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role et admins insèrent dans le journal"
  ON public.efacture_events FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_efacture_events_invoice ON public.efacture_events(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_efacture_events_inbound ON public.efacture_events(inbound_invoice_id) WHERE inbound_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_efacture_events_created_at ON public.efacture_events(created_at DESC);
