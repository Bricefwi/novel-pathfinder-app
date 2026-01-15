-- Add missing columns to profiles table for enhanced onboarding
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS height_cm integer,
ADD COLUMN IF NOT EXISTS weight_kg integer,
ADD COLUMN IF NOT EXISTS budget_range text,
ADD COLUMN IF NOT EXISTS travel_preferences text[];

-- Add comment explaining sensitive data purpose
COMMENT ON COLUMN public.profiles.height_cm IS 'Height in cm - used for horse matching';
COMMENT ON COLUMN public.profiles.weight_kg IS 'Weight in kg - used for horse matching and safety';
COMMENT ON COLUMN public.profiles.budget_range IS 'Preferred budget range for trips';
COMMENT ON COLUMN public.profiles.travel_preferences IS 'Travel style preferences array';