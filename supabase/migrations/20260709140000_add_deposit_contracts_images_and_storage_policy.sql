-- ============================================================
-- Migration: Add image columns to deposit_contracts & relax storage RLS for room_images
-- File: 20260709140000_add_deposit_contracts_images_and_storage_policy.sql
-- ============================================================

-- 1. Thêm các cột lưu ảnh minh chứng cọc vào bảng deposit_contracts
ALTER TABLE public.deposit_contracts 
ADD COLUMN IF NOT EXISTS lead_view_image_url TEXT NULL,
ADD COLUMN IF NOT EXISTS transfer_proof_url TEXT NULL;

-- 2. Nới lỏng chính sách RLS cho Storage room_images để hỗ trợ Upload từ Client-side (vốn chạy Anon trong Custom Auth)
DROP POLICY IF EXISTS "room_images: authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "room_images: authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "room_images: authenticated delete" ON storage.objects;

-- Tạo chính sách cho phép toàn bộ vai trò (bao gồm cả anon và authenticated) được thực hiện thao tác
CREATE POLICY "room_images: public insert"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'room_images');

CREATE POLICY "room_images: public update"
ON storage.objects FOR UPDATE TO public
USING (bucket_id = 'room_images');

CREATE POLICY "room_images: public delete"
ON storage.objects FOR DELETE TO public
USING (bucket_id = 'room_images');
