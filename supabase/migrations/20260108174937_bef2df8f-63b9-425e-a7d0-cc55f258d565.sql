-- Create user_reviews table for subscriber reviews
CREATE TABLE public.user_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  photo_urls TEXT[] DEFAULT '{}',
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Les utilisateurs connectés peuvent créer un avis"
ON public.user_reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier leur avis"
ON public.user_reviews FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leur avis"
ON public.user_reviews FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Tout le monde peut voir les avis approuvés"
ON public.user_reviews FOR SELECT
USING (is_approved = true OR auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_reviews_updated_at
BEFORE UPDATE ON public.user_reviews
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for review photos
INSERT INTO storage.buckets (id, name, public) VALUES ('review-photos', 'review-photos', true);

-- Storage policies
CREATE POLICY "Les utilisateurs connectés peuvent uploader leurs photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Tout le monde peut voir les photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'review-photos');

CREATE POLICY "Les utilisateurs peuvent supprimer leurs photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]);