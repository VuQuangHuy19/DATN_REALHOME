-- Migration: Cascade building code updates to rooms
-- File: supabase/migrations/20260709200000_cascade_building_code_updates.sql

CREATE OR REPLACE FUNCTION public.fn_cascade_building_code_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If building code is updated, cascade the change to rooms
  IF (OLD.code IS DISTINCT FROM NEW.code) THEN
    UPDATE public.rooms
    SET building_id = NEW.code
    WHERE building_id = OLD.code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create it
DROP TRIGGER IF EXISTS trg_cascade_building_code_update ON public.buildings;

CREATE TRIGGER trg_cascade_building_code_update
AFTER UPDATE ON public.buildings
FOR EACH ROW
EXECUTE FUNCTION public.fn_cascade_building_code_update();
