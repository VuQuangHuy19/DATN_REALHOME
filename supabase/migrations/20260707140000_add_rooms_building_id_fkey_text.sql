  -- Migration: Add foreign key constraint between rooms.building_id (TEXT) and buildings.code (TEXT)
  -- ==============================================================================================

  -- 1. Xóa khóa ngoại cũ nếu có để tránh lỗi phụ thuộc khi sửa đổi khóa UNIQUE của bảng buildings
  ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_building_id_fkey;

  -- 2. Đảm bảo cột code trong bảng buildings là UNIQUE (bắt buộc để làm khóa ngoại)
  ALTER TABLE public.buildings DROP CONSTRAINT IF EXISTS buildings_code_key;
  ALTER TABLE public.buildings ADD CONSTRAINT buildings_code_key UNIQUE (code);

  -- 3. Tạo lại khóa ngoại từ rooms(building_id) tham chiếu đến buildings(code)
  ALTER TABLE public.rooms 
    ADD CONSTRAINT rooms_building_id_fkey 
    FOREIGN KEY (building_id) 
    REFERENCES public.buildings(code) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;
