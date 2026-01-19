-- Mise à jour des adresses email par typologie dans app_config
INSERT INTO public.app_config (key, value, description, created_at, updated_at)
VALUES 
  ('email_from_quotes', '"Devis An Arwen <devis@ferme-equestre-arwen.com>"', 'Adresse email expéditeur pour les devis', now(), now()),
  ('email_from_invoices', '"Factures An Arwen <factures@ferme-equestre-arwen.com>"', 'Adresse email expéditeur pour les factures', now(), now()),
  ('email_from_relance', '"Rappels An Arwen <relance@ferme-equestre-arwen.com>"', 'Adresse email expéditeur pour les relances automatiques', now(), now())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

-- Mettre à jour les entrées existantes avec les nouvelles adresses
UPDATE public.app_config 
SET value = '"Newsletter An Arwen <newsletter@ferme-equestre-arwen.com>"',
    description = 'Adresse email expéditeur pour les newsletters',
    updated_at = now()
WHERE key = 'email_from_newsletter';

UPDATE public.app_config 
SET value = '"Notifications An Arwen <notifications@ferme-equestre-arwen.com>"',
    description = 'Adresse email expéditeur pour les notifications système',
    updated_at = now()
WHERE key = 'email_from_system';

UPDATE public.app_config 
SET value = '{"email": "contact@ferme-equestre-arwen.com", "phone": "06 21 49 60 00", "website": "https://www.ferme-equestre-an-arwen.com"}'::jsonb,
    updated_at = now()
WHERE key = 'contact_main';