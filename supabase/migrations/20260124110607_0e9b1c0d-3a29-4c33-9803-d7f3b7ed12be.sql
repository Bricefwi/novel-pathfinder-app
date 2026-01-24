-- Fix ecosystem_suggestions: Add SELECT policy to restrict reading to admins only
-- This prevents harvesting of suggester emails and names by unauthorized users

-- First, check if there's an existing permissive SELECT policy and drop it
DROP POLICY IF EXISTS "Anyone can view suggestions" ON public.ecosystem_suggestions;

-- Create restrictive SELECT policy - only admins can read suggestions
CREATE POLICY "Only admins can view suggestions"
ON public.ecosystem_suggestions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));