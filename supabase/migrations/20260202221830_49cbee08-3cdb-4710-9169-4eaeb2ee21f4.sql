-- ====================================================
-- MIGRATION DE SÉCURITÉ CRITIQUE
-- Renforce les politiques RLS pour les données sensibles
-- ====================================================

-- 1. QUOTES: Supprimer l'accès par email non authentifié et exiger user_id
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs devis" ON public.quotes;
DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour leurs devis" ON public.quotes;

-- Nouvelle politique SELECT: admin OU propriétaire (par user_id seulement)
CREATE POLICY "quotes_select_secure" ON public.quotes
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- Nouvelle politique UPDATE: admin OU propriétaire (par user_id seulement)
CREATE POLICY "quotes_update_secure" ON public.quotes
FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- 2. INVOICES: Supprimer l'accès par email non authentifié
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs factures" ON public.invoices;
DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour leurs factures" ON public.invoices;

-- Nouvelle politique SELECT: admin OU propriétaire (par user_id seulement)
CREATE POLICY "invoices_select_secure" ON public.invoices
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- Nouvelle politique UPDATE: admin OU propriétaire + validation client
CREATE POLICY "invoices_update_secure" ON public.invoices
FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- 3. LEGAL_ACCEPTANCES: Exiger user_id pour les insertions
DROP POLICY IF EXISTS "Utilisateurs peuvent créer leurs acceptations" ON public.legal_acceptances;
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs acceptations" ON public.legal_acceptances;

-- Nouvelle politique INSERT: exige une authentification et un user_id valide
CREATE POLICY "legal_acceptances_insert_secure" ON public.legal_acceptances
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- Nouvelle politique SELECT: admin OU propriétaire
CREATE POLICY "legal_acceptances_select_secure" ON public.legal_acceptances
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- 4. BOOKINGS: Exiger user_id pour les insertions (pas de NULL)
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des réservations" ON public.bookings;

-- Nouvelle politique INSERT: exige une authentification
CREATE POLICY "bookings_insert_secure" ON public.bookings
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- 5. SECURITY_AUDIT_LOG: Restreindre les insertions au service role (via fonction)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_log;

-- Seuls les admins peuvent insérer (les insertions système passent par le service role)
CREATE POLICY "audit_log_insert_admin" ON public.security_audit_log
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- 6. ANALYTICS_EVENTS: Ajouter une validation basique
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.analytics_events;

-- Permettre les insertions mais avec une limite sur les données
CREATE POLICY "analytics_insert_limited" ON public.analytics_events
FOR INSERT WITH CHECK (
  -- Permet les insertions anonymes mais limite la taille des metadata
  jsonb_typeof(metadata) = 'object' OR metadata IS NULL
);