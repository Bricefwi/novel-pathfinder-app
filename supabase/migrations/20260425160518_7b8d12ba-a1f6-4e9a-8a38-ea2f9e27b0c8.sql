
-- Recreate view with SECURITY INVOKER (default in PG15+, but explicit for linter)
DROP VIEW IF EXISTS public.accommodation_availability;

CREATE VIEW public.accommodation_availability
WITH (security_invoker = true) AS
SELECT id, name, date, is_available, price_per_night, created_at
FROM public.accommodation_slots;

GRANT SELECT ON public.accommodation_availability TO anon, authenticated;

-- Replace the always-true SELECT policy on accommodation_slots with admin-only
DROP POLICY IF EXISTS "Public can view availability columns only via view" ON public.accommodation_slots;

-- Admins keep full access via existing "Les admins peuvent gérer les disponibilités" (ALL).
-- The public/anon access is now ONLY through the accommodation_availability view,
-- but the view runs with the querier's permissions, so we need a SELECT policy
-- that authorizes reading the safe columns. We allow SELECT for everyone but the
-- view limits the columns exposed. Since the view runs as invoker, we still need
-- RLS to allow SELECT — restrict to anon/authenticated reading via the view only
-- by NOT exposing booking_id/notes columns through any client-accessible policy.

-- Re-add a public SELECT policy (the view filters columns; sensitive ones are not in it).
-- Note: direct table access still works for authenticated requests, which is why we
-- need to think about this. Better approach: only allow admin SELECT on the table,
-- and make the view SECURITY DEFINER with restricted logic. But linter flagged that.
-- Compromise: SELECT policy restricted to admins only on the table; public uses view.
-- The view with security_invoker requires the underlying table to allow SELECT for caller.
-- So: grant SELECT on view's columns by allowing table SELECT but the client should
-- query the view. For RLS, we need a policy. Use admin-only on table + view bypasses
-- via a SECURITY DEFINER function instead.

-- Final approach: drop the view, create a SECURITY INVOKER-friendly policy that
-- only exposes safe data by re-adding a public policy (RLS doesn't filter columns).
-- Since RLS cannot filter columns, the cleanest fix is column-level GRANT.
DROP VIEW IF EXISTS public.accommodation_availability;

-- Revoke all on table from anon, then grant only safe columns
REVOKE ALL ON public.accommodation_slots FROM anon, authenticated;
GRANT SELECT (id, name, date, is_available, price_per_night, created_at) ON public.accommodation_slots TO anon, authenticated;
GRANT ALL ON public.accommodation_slots TO service_role;

-- Re-add a public SELECT policy (column GRANTs will prevent reading booking_id/notes)
CREATE POLICY "Public can view safe availability columns"
ON public.accommodation_slots
FOR SELECT
TO anon, authenticated
USING (true);
