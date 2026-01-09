-- Ajouter le champ newsletter_subscribed à la table profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS newsletter_subscribed boolean DEFAULT true;

-- Ajouter un commentaire pour documenter le champ
COMMENT ON COLUMN public.profiles.newsletter_subscribed IS 'Indique si l''utilisateur est abonné à la newsletter pour recevoir les nouvelles activités';