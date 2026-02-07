-- Trigger pour recalculer current_participants UNIQUEMENT sur réservations confirmées
-- Le stock ne diminue que si le statut de la réservation est 'confirmed', 'completed'

CREATE OR REPLACE FUNCTION public.update_slot_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_activity_id uuid;
  v_start_date date;
  v_end_date date;
  v_confirmed_count integer;
  v_slot_id uuid;
BEGIN
  -- Déterminer l'enregistrement pertinent (NEW pour INSERT/UPDATE, OLD pour DELETE)
  IF TG_OP = 'DELETE' THEN
    v_activity_id := OLD.activity_id;
    v_start_date := OLD.start_date;
    v_end_date := OLD.end_date;
  ELSE
    v_activity_id := NEW.activity_id;
    v_start_date := NEW.start_date;
    v_end_date := NEW.end_date;
  END IF;

  -- Si pas d'activity_id, rien à faire
  IF v_activity_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- Trouver le slot correspondant à cette réservation
  FOR v_slot_id IN
    SELECT id FROM public.activity_slots
    WHERE activity_id = v_activity_id
      AND start_date <= COALESCE(v_end_date, v_start_date)
      AND end_date >= v_start_date
  LOOP
    -- Compter UNIQUEMENT les réservations confirmées/complétées pour ce slot
    SELECT COALESCE(SUM(b.participants), 0) INTO v_confirmed_count
    FROM public.bookings b
    WHERE b.activity_id = v_activity_id
      AND b.status IN ('confirmed', 'completed')
      AND b.start_date <= (SELECT end_date FROM public.activity_slots WHERE id = v_slot_id)
      AND COALESCE(b.end_date, b.start_date) >= (SELECT start_date FROM public.activity_slots WHERE id = v_slot_id);

    -- Mettre à jour current_participants
    UPDATE public.activity_slots
    SET current_participants = v_confirmed_count,
        is_available = (v_confirmed_count < COALESCE(max_participants, 999)),
        updated_at = now()
    WHERE id = v_slot_id;
  END LOOP;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- Créer le trigger sur la table bookings
DROP TRIGGER IF EXISTS trigger_update_slot_participants ON public.bookings;
CREATE TRIGGER trigger_update_slot_participants
  AFTER INSERT OR UPDATE OF status, participants, activity_id, start_date, end_date
  OR DELETE
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_slot_participants();
