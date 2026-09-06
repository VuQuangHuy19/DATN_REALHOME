-- ==============================================================================
-- SQL MIGRATION: Bổ sung cột cho amenities, price_ranges và room_types
-- Chạy đoạn mã này trong Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Bổ sung cột icon cho bảng room_types (Loại phòng sinh động)
ALTER TABLE room_types 
ADD COLUMN IF NOT EXISTS icon TEXT;

-- 2. Bổ sung cột updated_at và description vào bảng amenities (dùng để lưu Phân loại vùng)
ALTER TABLE amenities 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE amenities 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Bổ sung cột updated_at vào bảng price_ranges
ALTER TABLE price_ranges 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Cập nhật các bản ghi cũ chưa có thời gian updated_at
UPDATE amenities SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE price_ranges SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE room_types SET updated_at = NOW() WHERE updated_at IS NULL;

-- 5. Tạo Trigger tự động cập nhật updated_at mỗi khi có câu lệnh UPDATE bản ghi
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_amenities_updated_at ON amenities;
CREATE TRIGGER trg_amenities_updated_at
BEFORE UPDATE ON amenities
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_price_ranges_updated_at ON price_ranges;
CREATE TRIGGER trg_price_ranges_updated_at
BEFORE UPDATE ON price_ranges
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_room_types_updated_at ON room_types;
CREATE TRIGGER trg_room_types_updated_at
BEFORE UPDATE ON room_types
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();
