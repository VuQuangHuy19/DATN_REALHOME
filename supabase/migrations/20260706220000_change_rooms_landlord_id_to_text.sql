-- Change public.rooms.landlord_id column from UUID to TEXT to store the landlord's code directly
ALTER TABLE public.rooms DROP COLUMN IF EXISTS landlord_id;
ALTER TABLE public.rooms ADD COLUMN landlord_id TEXT;

-- Update existing rooms to populate landlord_id with the landlords.code corresponding to the building's landlord_id
UPDATE public.rooms r
SET landlord_id = l.code
FROM public.buildings b
JOIN public.landlords l ON b.landlord_id = l.id
WHERE r.building_id = b.id;
