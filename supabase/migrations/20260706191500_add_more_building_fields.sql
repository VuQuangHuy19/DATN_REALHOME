-- Thêm các cột thông tin chi tiết vào bảng public.buildings
ALTER TABLE public.buildings
ADD COLUMN IF NOT EXISTS has_air_conditioner boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_water_heater boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_bed boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_wardrobe boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_kitchen_cabinet boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_refrigerator boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_hood boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_dressing_table boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS electricity_price numeric DEFAULT 4000,
ADD COLUMN IF NOT EXISTS water_price numeric DEFAULT 35000,
ADD COLUMN IF NOT EXISTS internet_price numeric DEFAULT 100000,
ADD COLUMN IF NOT EXISTS common_service_price numeric DEFAULT 200000,
ADD COLUMN IF NOT EXISTS common_service_description text DEFAULT 'Vệ sinh chung, đổ rác, bảo trì đồ đạc trong phòng, máy giặt chung',
ADD COLUMN IF NOT EXISTS fingerprint_lock_desc text DEFAULT 'Cổng vân tay, gửi xe free',
ADD COLUMN IF NOT EXISTS extra_occupant_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_car_parking boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS washing_machine_type text DEFAULT 'chung', -- 'riêng' | 'chung' | 'không có'
ADD COLUMN IF NOT EXISTS dryer_type text DEFAULT 'chung', -- 'riêng' | 'chung' | 'không có'
ADD COLUMN IF NOT EXISTS electric_vehicle_fee numeric DEFAULT 0;
