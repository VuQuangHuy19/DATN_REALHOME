-- ============================================================
-- Migration: Bổ sung cột code vào bảng landlords và cột manager_ids vào bảng buildings
-- File: 20260629012000_add_landlord_code_and_building_managers.sql
-- Project: RealHome Business
-- ============================================================

-- 1. Thêm cột code vào bảng landlords nếu chưa tồn tại
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'landlords' AND column_name = 'code'
  ) THEN
    ALTER TABLE public.landlords ADD COLUMN code TEXT;
  END IF;
END $$;

-- 2. Thêm cột manager_ids (Mảng UUID) vào bảng buildings nếu chưa tồn tại
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'buildings' AND column_name = 'manager_ids'
  ) THEN
    ALTER TABLE public.buildings ADD COLUMN manager_ids UUID[] DEFAULT '{}';
  END IF;
END $$;
