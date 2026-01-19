-- =====================================================
-- PHASE 1 : Table app_config pour la configuration centralisée
-- =====================================================

-- Création de la table app_config
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX idx_app_config_updated_at ON public.app_config(updated_at);
CREATE INDEX idx_app_config_created_at ON public.app_config(created_at);

-- Insertion des valeurs par défaut
INSERT INTO public.app_config (key, value, description) VALUES
  ('email_from_admin', '{"email": "direction@an-arwen.fr", "name": "Direction An Arwen"}', 'Email notifications administrateur'),
  ('email_from_system', '{"email": "notifications@an-arwen.fr", "name": "An Arwen"}', 'Email système (devis, factures, confirmations)'),
  ('email_from_newsletter', '{"email": "newsletter@an-arwen.fr", "name": "Newsletter An Arwen"}', 'Email pour la newsletter'),
  ('contact_main', '{"email": "contact@an-arwen.fr", "phone": "06 21 49 60 00", "website": "https://www.ferme-equestre-an-arwen.com"}', 'Coordonnées principales'),
  ('company_name', '"Ferme Équestre An Arwen"', 'Nom de la société'),
  ('company_address', '{"street": "Le Bignon", "city": "La Chapelle du Lou du Lac", "zip": "35360", "country": "France"}', 'Adresse postale'),
  ('website_url', '"https://www.ferme-equestre-an-arwen.com"', 'URL du site principal'),
  ('app_url', '"https://novel-pathfinder-app.lovable.app"', 'URL actuelle de l''application'),
  ('auto_invoice_on_booking', 'true', 'Créer automatiquement une facture après une réservation'),
  ('auto_send_invoice_on_creation', 'true', 'Envoyer automatiquement la facture'),
  ('newsletter_enabled', 'true', 'Activer/désactiver la newsletter'),
  ('whatsapp_number', '"+33659226270"', 'Numéro WhatsApp pour le support')
ON CONFLICT (key) DO NOTHING;

-- Activer RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Politique : lecture pour tous les authentifiés
CREATE POLICY "All authenticated can read config" ON public.app_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- Politique : modification réservée aux admins
CREATE POLICY "Only admins can modify config" ON public.app_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Fonction utilitaire pour récupérer une config
CREATE OR REPLACE FUNCTION public.get_config(config_key TEXT)
RETURNS JSONB AS $$
  SELECT value FROM public.app_config WHERE key = config_key;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Accorder les droits
GRANT EXECUTE ON FUNCTION public.get_config(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_config(TEXT) TO anon;

-- =====================================================
-- PHASE 5 : Table newsletter_subscribers pour la newsletter optimisée
-- =====================================================

-- Création de la table newsletter_subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  source TEXT CHECK (source IN ('signup', 'footer', 'quote_request', 'import', 'admin', 'profile_update')) DEFAULT 'signup',
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX idx_newsletter_active ON public.newsletter_subscribers(is_active);
CREATE INDEX idx_newsletter_email ON public.newsletter_subscribers(email);
CREATE INDEX idx_newsletter_user_id ON public.newsletter_subscribers(user_id);

-- Activer RLS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Politique : les admins peuvent tout gérer
CREATE POLICY "Admins can manage subscribers" ON public.newsletter_subscribers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Politique : les utilisateurs peuvent voir leur propre entrée
CREATE POLICY "Users can view their own subscriber entry" ON public.newsletter_subscribers
  FOR SELECT USING (user_id = auth.uid());

-- Politique : tout le monde peut s'inscrire
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- Trigger de synchronisation depuis profiles
CREATE OR REPLACE FUNCTION public.sync_newsletter_subscriber()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.newsletter_subscribed IS DISTINCT FROM OLD.newsletter_subscribed THEN
    IF NEW.newsletter_subscribed THEN
      INSERT INTO public.newsletter_subscribers (email, user_id, is_active, source)
      SELECT u.email, NEW.user_id, true, 'profile_update'
      FROM auth.users u WHERE u.id = NEW.user_id
      ON CONFLICT (email) DO UPDATE
      SET is_active = true, updated_at = NOW();
    ELSE
      UPDATE public.newsletter_subscribers
      SET is_active = false,
          unsubscribed_at = NOW(),
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_sync_newsletter ON public.profiles;

-- Créer le trigger
CREATE TRIGGER trigger_sync_newsletter
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_newsletter_subscriber();

-- =====================================================
-- PHASE 4 : Table email_audit_log pour l'audit des emails
-- =====================================================

-- Création de la table d'audit des emails
CREATE TABLE IF NOT EXISTS public.email_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('alert', 'report', 'reminder', 'quote', 'invoice', 'newsletter', 'notification')),
  subject TEXT,
  reference_id UUID,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX idx_email_audit_user ON public.email_audit_log(user_id);
CREATE INDEX idx_email_audit_type ON public.email_audit_log(type);
CREATE INDEX idx_email_audit_sent_at ON public.email_audit_log(sent_at);

-- Activer RLS
ALTER TABLE public.email_audit_log ENABLE ROW LEVEL SECURITY;

-- Politique : seuls les admins peuvent voir les logs d'emails
CREATE POLICY "Only admins can view email logs" ON public.email_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Politique : insertion via service role uniquement (edge functions)
CREATE POLICY "Service role can insert logs" ON public.email_audit_log
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- PHASE 6 : Vue client_activity_timeline pour la timeline unifiée
-- =====================================================

-- Création de la vue d'agrégation timeline
CREATE OR REPLACE VIEW public.client_activity_timeline AS
SELECT
  id,
  created_at AS date,
  'quote' AS event_type,
  status,
  activity_title AS title,
  user_id,
  total_price AS amount
FROM public.quotes
UNION ALL
SELECT
  id,
  created_at AS date,
  'booking' AS event_type,
  status::text,
  (SELECT title FROM public.activities WHERE id = activity_id) AS title,
  user_id,
  total_price AS amount
FROM public.bookings
UNION ALL
SELECT
  id,
  created_at AS date,
  'invoice' AS event_type,
  payment_status AS status,
  activity_title AS title,
  user_id,
  total_amount AS amount
FROM public.invoices
ORDER BY date DESC;

-- Accorder les droits de lecture
GRANT SELECT ON public.client_activity_timeline TO authenticated;