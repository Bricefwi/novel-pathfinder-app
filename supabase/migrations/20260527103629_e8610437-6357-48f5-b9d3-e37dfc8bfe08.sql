CREATE OR REPLACE FUNCTION public.generate_booking_number()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT;
  count_num INTEGER;
BEGIN
  year_str := EXTRACT(YEAR FROM NOW())::TEXT;
  SELECT COUNT(*) + 1 INTO count_num
  FROM public.bookings
  WHERE booking_number LIKE 'RES-' || year_str || '-%';
  RETURN 'RES-' || year_str || '-' || LPAD(count_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS booking_number TEXT;

WITH numbered AS (
  SELECT
    id,
    'RES-' || EXTRACT(YEAR FROM created_at)::TEXT || '-' ||
    LPAD(ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM created_at) ORDER BY created_at, id)::TEXT, 4, '0') AS generated_number
  FROM public.bookings
  WHERE booking_number IS NULL
)
UPDATE public.bookings b
SET booking_number = numbered.generated_number
FROM numbered
WHERE b.id = numbered.id;

ALTER TABLE public.bookings
ALTER COLUMN booking_number SET DEFAULT public.generate_booking_number();

ALTER TABLE public.bookings
ALTER COLUMN booking_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_booking_number
ON public.bookings(booking_number);