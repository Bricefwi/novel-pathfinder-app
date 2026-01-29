-- Create storage bucket for activity images
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-images', 'activity-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to activity images
CREATE POLICY "Public can view activity images"
ON storage.objects FOR SELECT
USING (bucket_id = 'activity-images');

-- Allow authenticated admins to upload activity images
CREATE POLICY "Admins can upload activity images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'activity-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow authenticated admins to update activity images
CREATE POLICY "Admins can update activity images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'activity-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow authenticated admins to delete activity images
CREATE POLICY "Admins can delete activity images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'activity-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);