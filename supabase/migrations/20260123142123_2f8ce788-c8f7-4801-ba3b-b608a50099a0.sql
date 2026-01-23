-- Création de la table pour stocker les événements marketing
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID, -- Optionnel, si l'utilisateur est connecté
    session_id UUID, -- Pour suivre les visiteurs non connectés
    event_type TEXT NOT NULL, -- ex: 'page_view', 'click_cta', 'form_submit'
    page_path TEXT, -- Sur quelle page ils sont
    source TEXT, -- D'où ils viennent (Google, Facebook, etc.)
    metadata JSONB DEFAULT '{}'::jsonb, -- Pour stocker les détails
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_session_id ON public.analytics_events(session_id);

-- Sécurité (RLS) : Tout le monde peut insérer, seul l'admin peut lire
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for everyone" ON public.analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for admins only" ON public.analytics_events
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));