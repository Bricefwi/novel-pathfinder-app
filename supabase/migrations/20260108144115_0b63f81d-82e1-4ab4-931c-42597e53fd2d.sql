-- Enum pour les rôles utilisateurs
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Enum pour les statuts de réservation
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Enum pour les types d'activités
CREATE TYPE public.activity_type AS ENUM ('randonnee', 'cours', 'stage', 'sejour', 'hebergement');

-- Enum pour les niveaux d'équitation
CREATE TYPE public.riding_level AS ENUM ('debutant', 'intermediaire', 'confirme', 'expert');

-- Table des profils utilisateurs
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  riding_level riding_level DEFAULT 'debutant',
  bio TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des rôles utilisateurs (séparée pour la sécurité)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Table des destinations/activités
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  activity_type activity_type NOT NULL,
  riding_level riding_level DEFAULT 'debutant',
  duration TEXT,
  price_from DECIMAL(10,2),
  price_to DECIMAL(10,2),
  location TEXT,
  region TEXT,
  country TEXT DEFAULT 'France',
  max_participants INTEGER DEFAULT 8,
  images JSONB DEFAULT '[]',
  featured_image TEXT,
  itinerary JSONB DEFAULT '[]',
  inclusions TEXT[],
  exclusions TEXT[],
  requirements TEXT[],
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des réservations
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  status booking_status DEFAULT 'pending',
  start_date DATE NOT NULL,
  end_date DATE,
  participants INTEGER DEFAULT 1,
  total_price DECIMAL(10,2),
  notes TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des articles de blog / carnet de voyage
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  featured_image TEXT,
  images JSONB DEFAULT '[]',
  category TEXT DEFAULT 'carnet-voyage',
  tags TEXT[],
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des photos de la galerie
CREATE TABLE public.gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  tags TEXT[],
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des témoignages
CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  author_location TEXT,
  author_avatar TEXT,
  content TEXT NOT NULL,
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des demandes de contact/devis
CREATE TABLE public.contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  preferred_date DATE,
  participants INTEGER,
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des favoris utilisateurs
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT favorites_item_check CHECK (
    (activity_id IS NOT NULL AND article_id IS NULL) OR
    (activity_id IS NULL AND article_id IS NOT NULL)
  )
);

-- Fonction pour vérifier les rôles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour créer un profil après inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers pour updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger pour créer profil à l'inscription
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour profiles
CREATE POLICY "Les utilisateurs peuvent voir tous les profils publics" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent créer leur profil" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies pour user_roles (lecture seule pour tous, admin pour modification)
CREATE POLICY "Les utilisateurs peuvent voir leurs rôles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies pour activities (public read)
CREATE POLICY "Tout le monde peut voir les activités actives" ON public.activities
  FOR SELECT USING (is_active = true);

CREATE POLICY "Les admins peuvent gérer les activités" ON public.activities
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies pour bookings
CREATE POLICY "Les utilisateurs peuvent voir leurs réservations" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Les utilisateurs peuvent créer des réservations" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Les utilisateurs peuvent modifier leurs réservations" ON public.bookings
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies pour articles (public read for published)
CREATE POLICY "Tout le monde peut voir les articles publiés" ON public.articles
  FOR SELECT USING (is_published = true);

CREATE POLICY "Les admins peuvent gérer les articles" ON public.articles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies pour gallery_photos (public read)
CREATE POLICY "Tout le monde peut voir les photos actives" ON public.gallery_photos
  FOR SELECT USING (is_active = true);

CREATE POLICY "Les admins peuvent gérer les photos" ON public.gallery_photos
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies pour testimonials (public read)
CREATE POLICY "Tout le monde peut voir les témoignages actifs" ON public.testimonials
  FOR SELECT USING (is_active = true);

CREATE POLICY "Les admins peuvent gérer les témoignages" ON public.testimonials
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies pour contact_requests
CREATE POLICY "Tout le monde peut créer une demande de contact" ON public.contact_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Les admins peuvent voir les demandes" ON public.contact_requests
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Les admins peuvent gérer les demandes" ON public.contact_requests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies pour favorites
CREATE POLICY "Les utilisateurs peuvent voir leurs favoris" ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent gérer leurs favoris" ON public.favorites
  FOR ALL USING (auth.uid() = user_id);