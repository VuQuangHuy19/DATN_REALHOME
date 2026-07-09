-- Migration: Cascade landlord code updates to buildings and rooms
-- File: supabase/migrations/20260709190000_cascade_landlord_code_updates.sql

CREATE OR REPLACE FUNCTION public.fn_cascade_landlord_code_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If landlord code is updated, cascade the change to buildings and rooms
  IF (OLD.code IS DISTINCT FROM NEW.code) THEN
    UPDATE public.buildings
    SET landlord_id = NEW.code
    WHERE landlord_id = OLD.code;

    UPDATE public.rooms
    SET landlord_id = NEW.code
    WHERE landlord_id = OLD.code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create it
DROP TRIGGER IF EXISTS trg_cascade_landlord_code_update ON public.landlords;

CREATE TRIGGER trg_cascade_landlord_code_update
AFTER UPDATE ON public.landlords
FOR EACH ROW
EXECUTE FUNCTION public.fn_cascade_landlord_code_update();
