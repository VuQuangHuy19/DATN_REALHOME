-- ============================================================
-- Migration: Create Room Images Table + RLS Policies
-- File: 20260701164800_create_room_images_table.sql
-- Project: RealHome Business
-- ============================================================

CREATE TABLE IF NOT EXISTS public.room_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    is_thumbnail BOOLEAN DEFAULT false NOT NULL,
    priority INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.room_images ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Anyone can view room images (public listings need this)
DROP POLICY IF EXISTS "room_images_select_policy" ON public.room_images;
CREATE POLICY "room_images_select_policy" ON public.room_images
    FOR SELECT USING (true);

-- 2. INSERT Policy: Authenticated users can insert images for their own company
DROP POLICY IF EXISTS "room_images_insert_policy" ON public.room_images;
CREATE POLICY "room_images_insert_policy" ON public.room_images
    FOR INSERT TO authenticated
    WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

-- 3. UPDATE Policy: Authenticated users can update images for their own company
DROP POLICY IF EXISTS "room_images_update_policy" ON public.room_images;
CREATE POLICY "room_images_update_policy" ON public.room_images
    FOR UPDATE TO authenticated
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1))
    WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

-- 4. DELETE Policy: Authenticated users can delete images for their own company
DROP POLICY IF EXISTS "room_images_delete_policy" ON public.room_images;
CREATE POLICY "room_images_delete_policy" ON public.room_images
    FOR DELETE TO authenticated
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

-- Add index on room_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_room_images_room_id ON public.room_images(room_id);
-- Add index on company_id for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_room_images_company_id ON public.room_images(company_id);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_room_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_room_images_updated_at ON public.room_images;
CREATE TRIGGER trg_room_images_updated_at
    BEFORE UPDATE ON public.room_images
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_room_images_updated_at();
