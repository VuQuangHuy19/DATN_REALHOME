-- ============================================================
-- Migration: Tạo bảng saas_invoices và các trigger bảo vệ SaaS (seats, suspended lockout)
-- File: 20260717090000_add_saas_invoices_and_triggers.sql
-- ============================================================

-- 1. BẢNG HÓA ĐƠN THU PHÍ DOANH NGHIỆP SAAS B2B (saas_invoices)
CREATE TABLE IF NOT EXISTS public.saas_invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id     UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  invoice_code        TEXT NOT NULL UNIQUE,
  amount              BIGINT NOT NULL,
  plan                TEXT NOT NULL CHECK (plan IN ('starter', 'professional', 'enterprise')),
  seats               INT NOT NULL DEFAULT 5,
  status              TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'cancelled')),
  payment_method      TEXT DEFAULT 'payos',
  payos_order_code    BIGINT UNIQUE,
  billing_period_start TIMESTAMPTZ,
  billing_period_end  TIMESTAMPTZ,
  payment_url         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bật bảo mật RLS cho saas_invoices
ALTER TABLE public.saas_invoices ENABLE ROW LEVEL SECURITY;

-- Chính sách bảo mật RLS cho saas_invoices
CREATE POLICY "saas_invoices_select" ON public.saas_invoices FOR SELECT TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

CREATE POLICY "saas_invoices_insert" ON public.saas_invoices FOR INSERT TO authenticated
  WITH CHECK (auth_is_super_admin());

CREATE POLICY "saas_invoices_update" ON public.saas_invoices FOR UPDATE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id())
  WITH CHECK (auth_is_super_admin());

CREATE POLICY "saas_invoices_delete" ON public.saas_invoices FOR DELETE TO authenticated
  USING (auth_is_super_admin());

-- Index hỗ trợ tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_saas_invoices_company ON public.saas_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_status ON public.saas_invoices(status);

-- 2. TRIGGER ENFORCE SEATS & BLOCKS SUSPENDED FOR PROFILE MUTATIONS
CREATE OR REPLACE FUNCTION enforce_seats_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_seats INT;
  v_active_count INT;
  v_company_status TEXT;
BEGIN
  -- Nếu profile không thuộc company nào hoặc là super_admin, bỏ qua kiểm tra
  IF NEW.company_id IS NULL OR NEW.role = 'super_admin' THEN
    RETURN NEW;
  END IF;

  -- 1. Kiểm tra xem công ty có đang bị khóa (suspended) không
  SELECT status INTO v_company_status FROM public.companies WHERE id = NEW.company_id;
  IF v_company_status = 'suspended' THEN
    RAISE EXCEPTION 'Công ty của bạn đang tạm khóa. Vui lòng thanh toán/gia hạn để tiếp tục thao tác.';
  END IF;

  -- 2. Chỉ kiểm tra giới hạn seats nếu tài khoản được kích hoạt (is_active = true)
  IF NEW.is_active = true THEN
    -- Lấy số lượng seats của gói đang active
    SELECT seats INTO v_seats 
    FROM public.subscriptions 
    WHERE company_id = NEW.company_id 
      AND status = 'active' 
      AND (ends_at IS NULL OR ends_at > NOW())
    LIMIT 1;

    -- Nếu chưa có gói active, mặc định là gói dùng thử 5 seats
    IF v_seats IS NULL THEN
      v_seats := 5;
    END IF;

    -- Đếm số profile đang hoạt động khác với profile hiện tại
    SELECT COUNT(*) INTO v_active_count 
    FROM public.profiles 
    WHERE company_id = NEW.company_id 
      AND is_active = true 
      AND id <> NEW.id;

    IF v_active_count >= v_seats THEN
      RAISE EXCEPTION 'Vượt quá giới hạn số lượng tài khoản (seats) của gói đăng ký (% seats). Vui lòng nâng cấp gói.', v_seats;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_enforce_seats ON public.profiles;
CREATE TRIGGER trg_profiles_enforce_seats
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION enforce_seats_limit();

-- 3. TRIGGER CHẶN CÁC HÀNH VI GHI KHI CÔNG TY BỊ KHÓA (SUSPENDED)
CREATE OR REPLACE FUNCTION enforce_active_company()
RETURNS TRIGGER AS $$
DECLARE
  v_company_status TEXT;
  v_company_id UUID;
BEGIN
  -- Lấy company_id từ bản ghi NEW (hoặc OLD nếu là hành động DELETE)
  v_company_id := COALESCE(NEW.company_id, OLD.company_id);

  IF v_company_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Cho phép Super Admin bypass
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Lấy trạng thái của công ty
  SELECT status INTO v_company_status FROM public.companies WHERE id = v_company_id;
  IF v_company_status = 'suspended' THEN
    RAISE EXCEPTION 'Công ty của bạn đang tạm khóa do hết hạn gói dịch vụ. Vui lòng thanh toán/gia hạn để tiếp tục thao tác.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger cho các bảng nghiệp vụ chính để thực hiện Read-Only khi bị khóa
DROP TRIGGER IF EXISTS trg_buildings_check_active ON public.buildings;
CREATE TRIGGER trg_buildings_check_active
BEFORE INSERT OR UPDATE OR DELETE ON public.buildings
FOR EACH ROW EXECUTE FUNCTION enforce_active_company();

DROP TRIGGER IF EXISTS trg_rooms_check_active ON public.rooms;
CREATE TRIGGER trg_rooms_check_active
BEFORE INSERT OR UPDATE OR DELETE ON public.rooms
FOR EACH ROW EXECUTE FUNCTION enforce_active_company();

DROP TRIGGER IF EXISTS trg_rental_contracts_check_active ON public.rental_contracts;
CREATE TRIGGER trg_rental_contracts_check_active
BEFORE INSERT OR UPDATE OR DELETE ON public.rental_contracts
FOR EACH ROW EXECUTE FUNCTION enforce_active_company();

DROP TRIGGER IF EXISTS trg_deposit_contracts_check_active ON public.deposit_contracts;
CREATE TRIGGER trg_deposit_contracts_check_active
BEFORE INSERT OR UPDATE OR DELETE ON public.deposit_contracts
FOR EACH ROW EXECUTE FUNCTION enforce_active_company();

DROP TRIGGER IF EXISTS trg_invoices_check_active ON public.invoices;
CREATE TRIGGER trg_invoices_check_active
BEFORE INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION enforce_active_company();

DROP TRIGGER IF EXISTS trg_employees_check_active ON public.employees;
CREATE TRIGGER trg_employees_check_active
BEFORE INSERT OR UPDATE OR DELETE ON public.employees
FOR EACH ROW EXECUTE FUNCTION enforce_active_company();

DROP TRIGGER IF EXISTS trg_leads_check_active ON public.leads;
CREATE TRIGGER trg_leads_check_active
BEFORE INSERT OR UPDATE OR DELETE ON public.leads
FOR EACH ROW EXECUTE FUNCTION enforce_active_company();

DROP TRIGGER IF EXISTS trg_appointments_check_active ON public.appointments;
CREATE TRIGGER trg_appointments_check_active
BEFORE INSERT OR UPDATE OR DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION enforce_active_company();
