-- Migration: Seed default room types for all companies
DO $$
DECLARE
  company_rec RECORD;
  room_type_name TEXT;
  default_types TEXT[] := ARRAY['Studio', 'Phòng trọ', '1PN', '2PN', '3PN', 'Penthouse', 'Shophouse', 'Văn phòng', 'Gác xép', 'Duplex'];
BEGIN
  FOR company_rec IN SELECT id FROM public.companies LOOP
    FOREACH room_type_name IN ARRAY default_types LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.room_types 
        WHERE company_id = company_rec.id AND name = room_type_name
      ) THEN
        INSERT INTO public.room_types (company_id, name, description)
        VALUES (company_rec.id, room_type_name, 'Loại phòng ' || room_type_name);
      END IF;
    END LOOP;
  END LOOP;
END $$;
