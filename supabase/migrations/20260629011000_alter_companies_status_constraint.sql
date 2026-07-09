-- ============================================================
-- Migration: Cập nhật check constraint của cột status trong bảng companies
-- File: 20260629011000_alter_companies_status_constraint.sql
-- Project: RealHome Business
-- ============================================================

-- 1. Xóa ràng buộc kiểm tra (check constraint) cũ
ALTER TABLE public.companies 
  DROP CONSTRAINT IF EXISTS companies_status_check;

-- 2. Tạo lại ràng buộc mới bao gồm trạng thái 'pending'
ALTER TABLE public.companies 
  ADD CONSTRAINT companies_status_check 
  CHECK (status IN ('pending', 'active', 'suspended', 'trial'));
