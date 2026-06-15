
UPDATE public.invoices i
SET user_id = u.id
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE i.user_id IS NULL
  AND i.client_email IS NOT NULL
  AND lower(i.client_email) = lower(u.email);

UPDATE public.quotes q
SET user_id = u.id
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE q.user_id IS NULL
  AND q.client_email IS NOT NULL
  AND lower(q.client_email) = lower(u.email);

CREATE OR REPLACE FUNCTION public.link_document_to_user_by_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.client_email IS NOT NULL THEN
    SELECT u.id INTO NEW.user_id
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE lower(u.email) = lower(NEW.client_email)
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_invoice_to_user ON public.invoices;
CREATE TRIGGER link_invoice_to_user
BEFORE INSERT OR UPDATE OF client_email ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.link_document_to_user_by_email();

DROP TRIGGER IF EXISTS link_quote_to_user ON public.quotes;
CREATE TRIGGER link_quote_to_user
BEFORE INSERT OR UPDATE OF client_email ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.link_document_to_user_by_email();
