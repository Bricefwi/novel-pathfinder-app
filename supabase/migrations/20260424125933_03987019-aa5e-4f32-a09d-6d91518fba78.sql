-- Table payment_schedules : suivi détaillé des échéances de paiement
CREATE TABLE public.payment_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number BETWEEN 1 AND 12),
  total_installments INTEGER NOT NULL DEFAULT 3 CHECK (total_installments BETWEEN 1 AND 12),
  expected_amount NUMERIC NOT NULL CHECK (expected_amount > 0),
  percentage NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'link_sent', 'paid', 'cancelled', 'failed')),
  due_date DATE,
  link_sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  payment_link_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT payment_schedules_quote_or_invoice CHECK (
    quote_id IS NOT NULL OR invoice_id IS NOT NULL
  )
);

-- Index pour performance
CREATE INDEX idx_payment_schedules_quote_id ON public.payment_schedules(quote_id);
CREATE INDEX idx_payment_schedules_invoice_id ON public.payment_schedules(invoice_id);
CREATE INDEX idx_payment_schedules_status ON public.payment_schedules(status);

-- Unicité: un seul versement par numéro et par devis
CREATE UNIQUE INDEX idx_payment_schedules_unique_quote_installment
  ON public.payment_schedules(quote_id, installment_number)
  WHERE quote_id IS NOT NULL AND status != 'cancelled';

-- Trigger updated_at
CREATE TRIGGER update_payment_schedules_updated_at
  BEFORE UPDATE ON public.payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger de validation: la somme des versements actifs ne doit pas dépasser le total du devis
CREATE OR REPLACE FUNCTION public.validate_payment_schedule_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote_total NUMERIC;
  v_sum_amounts NUMERIC;
BEGIN
  IF NEW.quote_id IS NOT NULL AND NEW.status != 'cancelled' THEN
    SELECT total_price INTO v_quote_total FROM public.quotes WHERE id = NEW.quote_id;
    
    IF v_quote_total IS NOT NULL THEN
      SELECT COALESCE(SUM(expected_amount), 0) INTO v_sum_amounts
      FROM public.payment_schedules
      WHERE quote_id = NEW.quote_id 
        AND status != 'cancelled'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
      
      IF (v_sum_amounts + NEW.expected_amount) > (v_quote_total + 1) THEN
        RAISE EXCEPTION 'La somme des versements (%€) dépasserait le montant total du devis (%€)', 
          v_sum_amounts + NEW.expected_amount, v_quote_total;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_payment_schedule_total_trigger
  BEFORE INSERT OR UPDATE ON public.payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payment_schedule_total();

-- Activer RLS
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins peuvent tout gérer sur payment_schedules"
  ON public.payment_schedules
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients peuvent voir leurs échéances"
  ON public.payment_schedules
  FOR SELECT
  USING (
    quote_id IN (SELECT id FROM public.quotes WHERE user_id = auth.uid())
    OR invoice_id IN (SELECT id FROM public.invoices WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role peut insérer pour webhooks"
  ON public.payment_schedules
  FOR INSERT
  WITH CHECK (true);