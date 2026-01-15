-- Table pour stocker les suggestions de lieux
CREATE TABLE public.ecosystem_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggester_name TEXT NOT NULL,
  suggester_email TEXT NOT NULL,
  location_name TEXT NOT NULL,
  location_address TEXT,
  location_website TEXT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'generated')),
  admin_notes TEXT,
  generated_article_id UUID REFERENCES public.ecosystem_articles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.ecosystem_suggestions ENABLE ROW LEVEL SECURITY;

-- Politique d'insertion publique (tout le monde peut proposer)
CREATE POLICY "Anyone can submit suggestions"
  ON public.ecosystem_suggestions
  FOR INSERT
  WITH CHECK (true);

-- Politique de lecture/gestion admin uniquement
CREATE POLICY "Admins can manage suggestions"
  ON public.ecosystem_suggestions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Ajouter colonnes d'override d'images dans ecosystem_articles
ALTER TABLE public.ecosystem_articles
ADD COLUMN IF NOT EXISTS featured_image_override TEXT,
ADD COLUMN IF NOT EXISTS images_override TEXT[];