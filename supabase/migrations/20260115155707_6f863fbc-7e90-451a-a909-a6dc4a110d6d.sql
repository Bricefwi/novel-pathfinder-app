-- Ajout de la colonne pour tracker les notifications de validation envoyées
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS validation_notification_sent BOOLEAN DEFAULT false;

-- Commentaire explicatif
COMMENT ON COLUMN public.quotes.validation_notification_sent IS 'Indique si un email de relance a été envoyé après validation du devis par l admin';