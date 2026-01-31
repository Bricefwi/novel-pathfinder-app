-- Ajouter le champ travel_diary à la table activities
-- Stocke le carnet de voyage comme JSONB avec les sections structurées

ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS travel_diary JSONB DEFAULT NULL;

-- Ajouter un index pour les recherches
CREATE INDEX IF NOT EXISTS idx_activities_travel_diary ON public.activities USING GIN (travel_diary);

-- Commentaire descriptif
COMMENT ON COLUMN public.activities.travel_diary IS 'Carnet de voyage structuré: sections pourquoi_sejour, itineraire, hebergements, equipement, infos_pratiques, contacts';

-- Mettre à jour la politique RLS existante si nécessaire (déjà public en lecture)
-- Les activités sont déjà accessibles en lecture publique via les policies existantes