-- Migration: change rooms.building_id from UUID referencing buildings.id to TEXT storing buildings.code
-- ==============================================================================================

DO $$
DECLARE
    column_type text;
BEGIN
    -- 1. Lấy kiểu dữ liệu hiện tại của cột building_id trong bảng rooms
    SELECT data_type INTO column_type
    FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'building_id';

    -- 2. Nếu cột đang là UUID
    IF column_type = 'uuid' THEN
        -- Tạo cột tạm thời UUID để lưu giữ liên kết
        ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS temp_building_uuid UUID;
        UPDATE public.rooms SET temp_building_uuid = building_id;

        -- Xóa cột building_id UUID cũ (dùng CASCADE để giải phóng khóa ngoại)
        ALTER TABLE public.rooms DROP COLUMN IF EXISTS building_id CASCADE;

        -- Tạo lại cột building_id là TEXT
        ALTER TABLE public.rooms ADD COLUMN building_id TEXT;

        -- Cập nhật dữ liệu từ cột tạm thời sang code
        UPDATE public.rooms r
        SET building_id = b.code
        FROM public.buildings b
        WHERE r.temp_building_uuid = b.id;

        -- Xóa cột tạm thời
        ALTER TABLE public.rooms DROP COLUMN IF EXISTS temp_building_uuid;

    -- 3. Nếu cột đã là TEXT/character varying nhưng chứa chuỗi UUID cũ chưa được map
    ELSIF column_type IN ('text', 'character varying') THEN
        -- Chỉ cập nhật những phòng có building_id là chuỗi định dạng UUID
        UPDATE public.rooms r
        SET building_id = b.code
        FROM public.buildings b
        WHERE r.building_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND r.building_id::uuid = b.id;
    END IF;
END $$;

-- Đảm bảo khôi phục lại mối quan hệ khóa ngoại (foreign key relation) cho Supabase PostgREST select
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_building_id_fkey;

ALTER TABLE public.buildings DROP CONSTRAINT IF EXISTS buildings_code_key;
ALTER TABLE public.buildings ADD CONSTRAINT buildings_code_key UNIQUE (code);

ALTER TABLE public.rooms 
  ADD CONSTRAINT rooms_building_id_fkey 
  FOREIGN KEY (building_id) 
  REFERENCES public.buildings(code) 
  ON UPDATE CASCADE 
  ON DELETE CASCADE;
