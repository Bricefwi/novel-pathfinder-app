-- PRIORITY 1: Lock down profiles table (GDPR compliance)
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir tous les profils publics" ON public.profiles;

-- Create restrictive policy: users can only view their own profile, admins can view all
CREATE POLICY "Users can view own profile or admins view all"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- PRIORITY 2: Restrict review-photos bucket access
-- Make bucket private instead of public
UPDATE storage.buckets 
SET public = false 
WHERE id = 'review-photos';

-- Drop old permissive SELECT policy
DROP POLICY IF EXISTS "Tout le monde peut voir les photos" ON storage.objects;

-- Create new SELECT policy: approved reviews only, or owner, or admin
CREATE POLICY "View photos of approved reviews or own photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'review-photos' AND
  (
    -- Owner can see their own photos
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Admins can see all
    public.has_role(auth.uid(), 'admin'::app_role)
    OR
    -- Anyone can see photos from approved reviews
    EXISTS (
      SELECT 1 FROM public.user_reviews ur
      WHERE ur.is_approved = true
      AND ur.user_id::text = (storage.foldername(name))[1]
    )
  )
);