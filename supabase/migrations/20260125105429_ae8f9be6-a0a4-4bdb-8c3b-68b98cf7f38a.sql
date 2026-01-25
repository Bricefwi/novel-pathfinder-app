-- Ajouter les nouveaux champs au profil pour enrichir l'onboarding
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS address_line1 text,
ADD COLUMN IF NOT EXISTS address_line2 text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'France',
ADD COLUMN IF NOT EXISTS past_experiences text,
ADD COLUMN IF NOT EXISTS health_info text,
ADD COLUMN IF NOT EXISTS has_own_equipment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS equipment_details text,
ADD COLUMN IF NOT EXISTS preferred_periods text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS travel_companions text,
ADD COLUMN IF NOT EXISTS travel_dreams text;

COMMENT ON COLUMN public.profiles.birth_date IS 'Date de naissance du cavalier';
COMMENT ON COLUMN public.profiles.address_line1 IS 'Adresse ligne 1';
COMMENT ON COLUMN public.profiles.city IS 'Ville';
COMMENT ON COLUMN public.profiles.postal_code IS 'Code postal';
COMMENT ON COLUMN public.profiles.past_experiences IS 'Expériences équestres passées (pays visités, randonnées)';
COMMENT ON COLUMN public.profiles.health_info IS 'Informations médicales importantes (allergies, conditions)';
COMMENT ON COLUMN public.profiles.has_own_equipment IS 'Possède son propre équipement';
COMMENT ON COLUMN public.profiles.equipment_details IS 'Détails de l''équipement possédé';
COMMENT ON COLUMN public.profiles.preferred_periods IS 'Périodes de voyage préférées';
COMMENT ON COLUMN public.profiles.travel_companions IS 'Avec qui voyage habituellement';
COMMENT ON COLUMN public.profiles.travel_dreams IS 'Description libre des rêves et envies de voyages';