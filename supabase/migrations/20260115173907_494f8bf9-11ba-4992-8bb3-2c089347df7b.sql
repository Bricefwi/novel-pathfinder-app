-- Table de cache pour les contenus SEO générés dynamiquement
CREATE TABLE IF NOT EXISTS public.seo_cache (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text/plain',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour la recherche rapide par expiration
CREATE INDEX idx_seo_cache_expires_at ON public.seo_cache(expires_at);

-- Fonction pour nettoyer le cache expiré (appelée périodiquement)
CREATE OR REPLACE FUNCTION public.cleanup_expired_seo_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.seo_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS : lecture publique, écriture par service role uniquement
ALTER TABLE public.seo_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SEO cache is publicly readable"
ON public.seo_cache FOR SELECT
USING (true);

-- Pas de politique INSERT/UPDATE/DELETE pour les utilisateurs normaux
-- Seul le service_role peut écrire via les Edge Functions

COMMENT ON TABLE public.seo_cache IS 'Cache pour les contenus SEO dynamiques (llms.txt, sitemap.xml)';