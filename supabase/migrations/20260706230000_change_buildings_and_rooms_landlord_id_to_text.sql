-- Migration: change buildings.landlord_id and rooms.landlord_id to TEXT to store landlords.code
-- ==============================================================================================

-- 1. Create temporary column on buildings to preserve existing UUID relation
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS temp_landlord_uuid UUID;
UPDATE public.buildings SET temp_landlord_uuid = landlord_id;

-- 2. Drop existing UUID landlord_id column on buildings
ALTER TABLE public.buildings DROP COLUMN IF EXISTS landlord_id;

-- 3. Re-create buildings.landlord_id as TEXT
ALTER TABLE public.buildings ADD COLUMN landlord_id TEXT;

-- 4. Migrate existing data using code from landlords
UPDATE public.buildings b
SET landlord_id = l.code
FROM public.landlords l
WHERE b.temp_landlord_uuid = l.id;

-- 5. Drop the temporary column
ALTER TABLE public.buildings DROP COLUMN IF EXISTS temp_landlord_uuid;


-- 6. Drop existing landlord_id column on rooms if any
ALTER TABLE public.rooms DROP COLUMN IF EXISTS landlord_id;

-- 7. Create rooms.landlord_id as TEXT
ALTER TABLE public.rooms ADD COLUMN landlord_id TEXT;

-- 8. Migrate existing rooms data based on the building's landlord_id
UPDATE public.rooms r
SET landlord_id = b.landlord_id
FROM public.buildings b
WHERE r.building_id = b.id;
