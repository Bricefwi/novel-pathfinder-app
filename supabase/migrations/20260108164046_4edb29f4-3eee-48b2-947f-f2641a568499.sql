-- Étendre la table profiles pour inclure les préférences détaillées
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS riding_experience_years integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS riding_style text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS dream_destinations text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_trip_types text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_duration text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS travel_style text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Créer une table pour les créneaux de disponibilité des activités
CREATE TABLE IF NOT EXISTS public.activity_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES public.activities(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  max_participants integer DEFAULT 8,
  current_participants integer DEFAULT 0,
  price numeric,
  is_available boolean DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde peut voir les créneaux disponibles"
ON public.activity_slots FOR SELECT
USING (is_available = true);

CREATE POLICY "Les admins peuvent gérer les créneaux"
ON public.activity_slots FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Créer une table pour les disponibilités hébergement
CREATE TABLE IF NOT EXISTS public.accommodation_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Yourte An Arwen',
  date date NOT NULL UNIQUE,
  is_available boolean DEFAULT true,
  price_per_night numeric DEFAULT 80,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accommodation_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde peut voir les disponibilités hébergement"
ON public.accommodation_slots FOR SELECT
USING (true);

CREATE POLICY "Les admins peuvent gérer les disponibilités"
ON public.accommodation_slots FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Créer une table pour les abonnements aux activités
CREATE TABLE IF NOT EXISTS public.activity_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_id uuid REFERENCES public.activities(id) ON DELETE CASCADE,
  activity_slot_id uuid REFERENCES public.activity_slots(id) ON DELETE SET NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_id, activity_slot_id)
);

ALTER TABLE public.activity_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs peuvent voir leurs abonnements"
ON public.activity_subscriptions FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Les utilisateurs peuvent s'abonner"
ON public.activity_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent se désabonner"
ON public.activity_subscriptions FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Les utilisateurs peuvent supprimer leurs abonnements"
ON public.activity_subscriptions FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour updated_at sur activity_slots
CREATE TRIGGER update_activity_slots_updated_at
BEFORE UPDATE ON public.activity_slots
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();