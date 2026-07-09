-- Migration: Add landlord_id column to rooms table referencing landlords(id)
-- and backfill existing data from the buildings table.
ALTER TABLE public.rooms 
ADD COLUMN landlord_id UUID REFERENCES public.landlords(id) ON DELETE SET NULL;

-- Backfill data: update rooms.landlord_id based on buildings.landlord_id
UPDATE public.rooms r
SET landlord_id = b.landlord_id
FROM public.buildings b
WHERE r.building_id = b.id;
