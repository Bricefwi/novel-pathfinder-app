-- Table pour stocker les devis
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  quote_number TEXT NOT NULL UNIQUE,
  
  -- Client info
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  client_address TEXT,
  
  -- Séjour info
  activity_id UUID,
  activity_title TEXT NOT NULL,
  activity_duration TEXT,
  start_date DATE,
  end_date DATE,
  
  -- Pricing
  unit_price NUMERIC NOT NULL DEFAULT 0,
  participants INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  deposit_percentage NUMERIC DEFAULT 30,
  
  -- Payment option
  payment_option TEXT DEFAULT 'deposit', -- deposit, full, installments
  
  -- Status
  status TEXT DEFAULT 'draft', -- draft, sent, accepted, rejected, expired
  valid_until DATE,
  
  -- CGU/CGV acceptance
  cgu_accepted BOOLEAN DEFAULT false,
  cgu_accepted_at TIMESTAMP WITH TIME ZONE,
  cgv_accepted BOOLEAN DEFAULT false,
  cgv_accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- PDF storage
  pdf_url TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour stocker les factures
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  
  -- Client info
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  client_address TEXT,
  
  -- Séjour info
  activity_title TEXT NOT NULL,
  activity_duration TEXT,
  start_date DATE,
  end_date DATE,
  
  -- Pricing
  unit_price NUMERIC NOT NULL DEFAULT 0,
  participants INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  
  -- Payment tracking
  payment_status TEXT DEFAULT 'pending', -- pending, partial, paid
  amount_paid NUMERIC DEFAULT 0,
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft', -- draft, sent, paid, cancelled
  due_date DATE,
  
  -- Client validation
  client_validated BOOLEAN DEFAULT false,
  client_validated_at TIMESTAMP WITH TIME ZONE,
  client_signature TEXT,
  
  -- CGU/CGV acceptance
  cgu_accepted BOOLEAN DEFAULT false,
  cgu_accepted_at TIMESTAMP WITH TIME ZONE,
  cgv_accepted BOOLEAN DEFAULT false,
  cgv_accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- PDF storage
  pdf_url TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Policies for quotes
CREATE POLICY "Les utilisateurs peuvent voir leurs devis"
  ON public.quotes FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Les admins peuvent créer des devis"
  ON public.quotes FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs devis"
  ON public.quotes FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Les admins peuvent supprimer les devis"
  ON public.quotes FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for invoices
CREATE POLICY "Les utilisateurs peuvent voir leurs factures"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Les admins peuvent créer des factures"
  ON public.invoices FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs factures"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Les admins peuvent supprimer les factures"
  ON public.invoices FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to generate quote number
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT;
  count_num INTEGER;
BEGIN
  year_str := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO count_num FROM public.quotes WHERE quote_number LIKE 'DEV-' || year_str || '-%';
  RETURN 'DEV-' || year_str || '-' || LPAD(count_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT;
  count_num INTEGER;
BEGIN
  year_str := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO count_num FROM public.invoices WHERE invoice_number LIKE 'FAC-' || year_str || '-%';
  RETURN 'FAC-' || year_str || '-' || LPAD(count_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to update updated_at
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();