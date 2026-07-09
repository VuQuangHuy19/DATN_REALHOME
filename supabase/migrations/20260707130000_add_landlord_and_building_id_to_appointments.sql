-- Migration: Add landlord_id and building_id to appointments table
-- ===============================================================

-- 1. Thêm cột landlord_id và building_id vào bảng appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS landlord_id TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS building_id TEXT;

-- 2. Cập nhật dữ liệu cho các lịch hẹn hiện tại dựa trên thông tin phòng (rooms)
-- Lưu ý: rooms.landlord_id và rooms.building_id đều đã là kiểu TEXT chứa code tương ứng
UPDATE public.appointments a
SET 
  building_id = r.building_id,
  landlord_id = r.landlord_id
FROM public.rooms r
WHERE a.room_id = r.id;
