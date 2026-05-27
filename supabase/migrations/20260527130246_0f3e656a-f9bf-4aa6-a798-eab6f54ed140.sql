
-- 1. Restrict anon access to accommodation_slots sensitive columns (notes, booking_id)
REVOKE SELECT ON public.accommodation_slots FROM anon;
GRANT SELECT (id, name, date, is_available, price_per_night, created_at) ON public.accommodation_slots TO anon;

-- 2. Restrict anon access to activity_slots sensitive column (notes)
REVOKE SELECT ON public.activity_slots FROM anon;
GRANT SELECT (id, activity_id, start_date, end_date, max_participants, price, current_participants, is_available, created_at, updated_at) ON public.activity_slots TO anon;

-- 3. Tighten payments INSERT policy: only service_role or admins
DROP POLICY IF EXISTS "Service role can insert payments" ON public.payments;
CREATE POLICY "Only service role and admins can insert payments"
ON public.payments
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

-- 4. Tighten email_audit_log INSERT
DROP POLICY IF EXISTS "Service role can insert logs" ON public.email_audit_log;
CREATE POLICY "Service role and admins can insert email logs"
ON public.email_audit_log
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

-- 5. Tighten payment_link_audit INSERT
DROP POLICY IF EXISTS "Service role et admins peuvent insérer dans le journal" ON public.payment_link_audit;
CREATE POLICY "Service role et admins peuvent insérer audit paiement"
ON public.payment_link_audit
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
