-- ============================================================
-- Migration: Bổ sung liên kết gia hạn hợp đồng thuê và biên bản bàn giao khi hoàn cọc
-- File: 20260717091000_add_handover_reports_and_contracts_renewal.sql
-- ============================================================

-- 1. LIÊN KẾT GIA HẠN HỢP ĐỒNG THUÊ (rental_contracts)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rental_contracts' AND column_name='renewed_from_contract_id') THEN
    ALTER TABLE public.rental_contracts ADD COLUMN renewed_from_contract_id UUID REFERENCES public.rental_contracts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. BẢNG BIÊN BẢN BÀN GIAO PHÒNG (handover_reports)
CREATE TABLE IF NOT EXISTS public.handover_reports (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  deposit_contract_id     UUID UNIQUE REFERENCES public.deposit_contracts(id) ON DELETE SET NULL,
  room_id                 UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  images                  TEXT[] DEFAULT '{}', -- Danh sách URLs ảnh/video hiện trạng
  notes                   TEXT,
  landlord_confirmed      BOOLEAN DEFAULT false,
  tenant_confirmed        BOOLEAN DEFAULT false,
  landlord_confirmed_at   TIMESTAMPTZ,
  tenant_confirmed_at     TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Bật bảo mật RLS cho handover_reports
ALTER TABLE public.handover_reports ENABLE ROW LEVEL SECURITY;

-- Chính sách RLS cho handover_reports
CREATE POLICY "handover_reports_select" ON public.handover_reports FOR SELECT TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

CREATE POLICY "handover_reports_insert" ON public.handover_reports FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "handover_reports_update" ON public.handover_reports FOR UPDATE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id())
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "handover_reports_delete" ON public.handover_reports FOR DELETE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

-- Triggers tự động điền người tạo/cập nhật
CREATE TRIGGER trg_handover_set_created_by BEFORE INSERT ON public.handover_reports
  FOR EACH ROW EXECUTE FUNCTION set_created_by_and_updated_by();

CREATE TRIGGER trg_handover_set_updated_by BEFORE UPDATE ON public.handover_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_by();

-- Index tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_handover_reports_company ON public.handover_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_handover_reports_deposit ON public.handover_reports(deposit_contract_id);

-- 3. RÀNG BUỘC CHẶN HOÀN CỌC NẾU CHƯA CÓ BIÊN BẢN BÀN GIAO ĐƯỢC XÁC NHẬN
CREATE OR REPLACE FUNCTION enforce_handover_refund()
RETURNS TRIGGER AS $$
DECLARE
  v_handover_exists BOOLEAN;
BEGIN
  -- Chỉ áp dụng khi đổi trạng thái sang 'refunded' (Đã hoàn cọc)
  IF NEW.status = 'refunded' AND (OLD.status IS NULL OR OLD.status <> 'refunded') THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.handover_reports 
      WHERE deposit_contract_id = NEW.id 
        AND landlord_confirmed = true 
        AND tenant_confirmed = true
    ) INTO v_handover_exists;

    IF NOT v_handover_exists THEN
      RAISE EXCEPTION 'Không thể chuyển sang trạng thái Hoàn cọc (refunded) nếu chưa có biên bản bàn giao phòng được ký/xác nhận đầy đủ bởi cả 2 bên.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deposit_contracts_refund_check ON public.deposit_contracts;
CREATE TRIGGER trg_deposit_contracts_refund_check
BEFORE UPDATE ON public.deposit_contracts
FOR EACH ROW EXECUTE FUNCTION enforce_handover_refund();
