-- 1. Thêm các cột mới vào bảng public.buildings
ALTER TABLE public.buildings
ADD COLUMN IF NOT EXISTS has_elevator boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS pccc_certified boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS common_drying_area text,
ADD COLUMN IF NOT EXISTS allow_pet boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_foreigners boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_vinfast_electric boolean DEFAULT true;

-- 2. Thêm các cột mới vào bảng public.rooms
ALTER TABLE public.rooms
ADD COLUMN IF NOT EXISTS has_private_balcony boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS max_occupants integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS max_vehicles_per_room integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS min_contract_months integer DEFAULT 12;

-- 3. Tạo bảng mới public.building_services nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS public.building_services (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    building_id uuid REFERENCES public.buildings(id) ON DELETE CASCADE,
    service_name text NOT NULL,
    price numeric NOT NULL DEFAULT 0,
    unit text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Kích hoạt Realtime cho bảng building_services
ALTER PUBLICATION supabase_realtime ADD TABLE public.building_services;
