-- Table pour stocker les avis Airbnb
CREATE TABLE public.airbnb_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_name TEXT NOT NULL,
  reviewer_years TEXT,
  review_date TEXT NOT NULL,
  stay_type TEXT DEFAULT 'Séjour d''une nuit',
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.airbnb_reviews ENABLE ROW LEVEL SECURITY;

-- Politique de lecture publique (les avis sont visibles par tous)
CREATE POLICY "Airbnb reviews are publicly readable"
  ON public.airbnb_reviews
  FOR SELECT
  USING (is_active = true);

-- Politique de gestion admin
CREATE POLICY "Admins can manage airbnb reviews"
  ON public.airbnb_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insérer les avis existants
INSERT INTO public.airbnb_reviews (reviewer_name, reviewer_years, review_date, stay_type, rating, content, sort_order) VALUES
('Charles', '4 ans sur Airbnb', 'août 2025', 'Séjour d''une nuit', 5, 'Merci à Arwen et sa famille pour son accueil dans ce lieu atypique.', 1),
('Karine Isabelle', '11 ans sur Airbnb', 'juillet 2025', 'Séjour d''une nuit', 5, 'Belle découverte ! La yourte est très belle et Arwen est adorable ! Nous avons fait aussi une balade a cheval avec elle. Tout ses animaux sont adorables. Nous avons passé un excellent séjour', 2),
('Charlotte', '12 ans sur Airbnb', 'août 2025', 'Séjour d''une nuit', 4, 'Nous avons été très bien accueillis dans un cadre insolite! Merci à ce très gentil couple.', 3),
('Léo', '10 ans sur Airbnb', 'août 2025', 'Séjour d''une nuit', 5, 'Tout s''est bien passé. Merci à Arwen pour sa dispo et gentillesse endroit idéal pour les enfants :)', 4);

-- Trigger pour updated_at
CREATE TRIGGER update_airbnb_reviews_updated_at
  BEFORE UPDATE ON public.airbnb_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();