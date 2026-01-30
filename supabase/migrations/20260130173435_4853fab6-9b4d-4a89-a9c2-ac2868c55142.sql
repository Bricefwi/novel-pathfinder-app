-- Fix client access to quotes/invoices by matching JWT email claim
-- This allows clients to VIEW/UPDATE their documents even when user_id is null/mismatched,
-- and enables CGU/CGV acceptance updates from the client space.

-- Quotes policies
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs devis" ON public.quotes;
DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour leurs devis" ON public.quotes;

CREATE POLICY "Les utilisateurs peuvent voir leurs devis"
ON public.quotes
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() = user_id
  OR lower(client_email) = lower((auth.jwt() ->> 'email'))
);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs devis"
ON public.quotes
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() = user_id
  OR lower(client_email) = lower((auth.jwt() ->> 'email'))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() = user_id
  OR lower(client_email) = lower((auth.jwt() ->> 'email'))
);

-- Invoices policies
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs factures" ON public.invoices;
DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour leurs factures" ON public.invoices;

CREATE POLICY "Les utilisateurs peuvent voir leurs factures"
ON public.invoices
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() = user_id
  OR lower(client_email) = lower((auth.jwt() ->> 'email'))
);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs factures"
ON public.invoices
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() = user_id
  OR lower(client_email) = lower((auth.jwt() ->> 'email'))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() = user_id
  OR lower(client_email) = lower((auth.jwt() ->> 'email'))
);
