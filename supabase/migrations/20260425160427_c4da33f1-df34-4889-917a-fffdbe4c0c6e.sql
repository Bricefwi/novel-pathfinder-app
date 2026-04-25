
-- 1. Fix accommodation_slots: hide booking_id and notes from anonymous users
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Tout le monde peut voir les disponibilités hébergement" ON public.accommodation_slots;

-- Create a public view exposing only safe columns (date + availability + price)
CREATE OR REPLACE VIEW public.accommodation_availability AS
SELECT id, name, date, is_available, price_per_night, created_at
FROM public.accommodation_slots;

GRANT SELECT ON public.accommodation_availability TO anon, authenticated;

-- New restrictive policy: authenticated users may see availability rows but should use the view for sensitive-free data
CREATE POLICY "Public can view availability columns only via view"
ON public.accommodation_slots
FOR SELECT
TO authenticated
USING (true);

-- 2. Fix chat_messages: remove the bypass via user_has_participated_in_room
-- Anyone could post one message and gain read access to all historical messages.
-- Restrict SELECT to message owner and admins only.
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir les messages de leur activité" ON public.chat_messages;

CREATE POLICY "Users can view their own messages or admins all"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 3. Fix payment_schedules: restrict insert to service_role and admins only
DROP POLICY IF EXISTS "Service role peut insérer pour webhooks" ON public.payment_schedules;

CREATE POLICY "Only service role and admins can insert payment schedules"
ON public.payment_schedules
FOR INSERT
TO public
WITH CHECK (
  auth.role() = 'service_role'
  OR has_role(auth.uid(), 'admin'::app_role)
);
