-- Rendre le bucket review-photos public pour permettre l'affichage des images
UPDATE storage.buckets 
SET public = true 
WHERE name = 'review-photos';