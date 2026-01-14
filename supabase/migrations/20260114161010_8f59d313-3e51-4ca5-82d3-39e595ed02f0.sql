-- First create the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create ecosystem articles table for eco-tourism blog
CREATE TABLE public.ecosystem_articles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT,
    featured_image TEXT,
    images TEXT[],
    category TEXT,
    location_name TEXT,
    location_address TEXT,
    location_phone TEXT,
    location_email TEXT,
    location_website TEXT,
    location_coordinates JSONB,
    distance_from_arwen TEXT,
    tags TEXT[],
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ecosystem_articles ENABLE ROW LEVEL SECURITY;

-- Public can read published articles
CREATE POLICY "Published articles are viewable by everyone"
ON public.ecosystem_articles
FOR SELECT
USING (is_published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage all articles"
ON public.ecosystem_articles
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Create updated_at trigger
CREATE TRIGGER update_ecosystem_articles_updated_at
BEFORE UPDATE ON public.ecosystem_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();