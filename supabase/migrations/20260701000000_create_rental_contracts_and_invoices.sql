-- ============================================================
-- Migration: Tạo bảng rental_contracts, service_readings, và invoices
-- File: 20260701000000_create_rental_contracts_and_invoices.sql
-- ============================================================

-- 1. BẢNG HỢP ĐỒNG THUÊ CHÍNH THỨC (rental_contracts)
CREATE TABLE IF NOT EXISTS public.rental_contracts (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  room_id                   UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  deposit_contract_id       UUID REFERENCES public.deposit_contracts(id) ON DELETE SET NULL,
  
  -- Thông tin Hợp đồng
  contract_code             TEXT NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'active' 
                            CHECK (status IN ('draft', 'active', 'ended', 'terminated', 'cancelled')),
  
  agreement_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date                DATE NOT NULL,
  end_date                  DATE NOT NULL,
  billing_cycle_months      INTEGER NOT NULL DEFAULT 1,
  payment_day_of_month      INTEGER NOT NULL DEFAULT 5,
  handover_date             DATE,
  
  -- BÊN CHO THUÊ PHÒNG (BÊN A)
  party_a_name              TEXT NOT NULL,
  party_a_dob               DATE,
  party_a_address           TEXT,
  party_a_id_card           TEXT,
  party_a_id_date           DATE,
  party_a_id_place          TEXT,
  party_a_phone             TEXT,
  
  -- BÊN THUÊ PHÒNG (BÊN B)
  party_b_name              TEXT NOT NULL,
  party_b_phone             TEXT NOT NULL,
  party_b_dob               DATE,
  party_b_id_card           TEXT,
  party_b_id_date           DATE,
  party_b_id_place          TEXT,
  party_b_address           TEXT,
  
  -- THỎA THUẬN TIỀN THUÊ & DỊCH VỤ
  rent_price                NUMERIC NOT NULL DEFAULT 0,
  electricity_price         NUMERIC DEFAULT 4000,
  water_price               TEXT DEFAULT '150000/người/tháng',
  service_price             TEXT DEFAULT '200000/người/tháng',
  other_services            JSONB DEFAULT '{}'::jsonb,
  tenant_count              INTEGER DEFAULT 1,
  payment_method            TEXT,
  deposit_amount            NUMERIC NOT NULL DEFAULT 0,
  
  -- Ghi chú & Kiểm toán
  note                      TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. BẢNG CHỈ SỐ DỊCH VỤ ĐỊNH KỲ (service_readings)
CREATE TABLE IF NOT EXISTS public.service_readings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  room_id                   UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  reading_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  period                    TEXT NOT NULL, -- Định dạng 'YYYY-MM' ví dụ '2026-07'
  
  -- Chỉ số điện
  electricity_old           NUMERIC NOT NULL DEFAULT 0,
  electricity_new           NUMERIC NOT NULL DEFAULT 0,
  
  -- Chỉ số nước
  water_old                 NUMERIC NOT NULL DEFAULT 0,
  water_new                 NUMERIC NOT NULL DEFAULT 0,
  
  note                      TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  UNIQUE (room_id, period)
);

-- 3. BẢNG HÓA ĐƠN DỊCH VỤ HÀNG THÁNG (invoices)
CREATE TABLE IF NOT EXISTS public.invoices (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  room_id                   UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  rental_contract_id        UUID REFERENCES public.rental_contracts(id) ON DELETE SET NULL,
  invoice_code              TEXT NOT NULL,
  period                    TEXT NOT NULL, -- Định dạng 'YYYY-MM'
  
  issue_date                DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date                  DATE NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'unpaid'
                            CHECK (status IN ('unpaid', 'paid', 'partially_paid', 'overdue', 'cancelled')),
  
  -- Chi tiết số tiền
  rent_amount               NUMERIC NOT NULL DEFAULT 0,
  electricity_usage         NUMERIC DEFAULT 0,
  electricity_amount        NUMERIC DEFAULT 0,
  water_amount              NUMERIC DEFAULT 0,
  service_amount            NUMERIC DEFAULT 0,
  other_amount              NUMERIC DEFAULT 0,
  other_details             TEXT,
  total_amount              NUMERIC NOT NULL DEFAULT 0,
  
  payment_date              TIMESTAMPTZ,
  payment_method            TEXT,
  note                      TEXT,
  
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  UNIQUE (room_id, period)
);

-- ============================================================
-- PHẦN CẤU HÌNH BẢO MẬT RLS
-- ============================================================

-- Bật RLS
ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 1. Chính sách cho rental_contracts
CREATE POLICY "rental_contracts_select" ON public.rental_contracts FOR SELECT TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

CREATE POLICY "rental_contracts_insert" ON public.rental_contracts FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "rental_contracts_update" ON public.rental_contracts FOR UPDATE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id())
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "rental_contracts_delete" ON public.rental_contracts FOR DELETE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

-- 2. Chính sách cho service_readings
CREATE POLICY "service_readings_select" ON public.service_readings FOR SELECT TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

CREATE POLICY "service_readings_insert" ON public.service_readings FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "service_readings_update" ON public.service_readings FOR UPDATE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id())
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "service_readings_delete" ON public.service_readings FOR DELETE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

-- 3. Chính sách cho invoices
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id())
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

-- ============================================================
-- PHẦN CẤU HÌNH TRIGGERS TỰ ĐỘNG GHI NHẬN KIỂM TOÁN
-- ============================================================

-- Triggers cho rental_contracts
CREATE TRIGGER trg_rental_set_created_by BEFORE INSERT ON public.rental_contracts
  FOR EACH ROW EXECUTE FUNCTION set_created_by_and_updated_by();

CREATE TRIGGER trg_rental_set_updated_by BEFORE UPDATE ON public.rental_contracts
  FOR EACH ROW EXECUTE FUNCTION set_updated_by();

-- Triggers cho service_readings
CREATE TRIGGER trg_readings_set_created_by BEFORE INSERT ON public.service_readings
  FOR EACH ROW EXECUTE FUNCTION set_created_by_and_updated_by();

CREATE TRIGGER trg_readings_set_updated_by BEFORE UPDATE ON public.service_readings
  FOR EACH ROW EXECUTE FUNCTION set_updated_by();

-- Triggers cho invoices
CREATE TRIGGER trg_invoices_set_created_by BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION set_created_by_and_updated_by();

CREATE TRIGGER trg_invoices_set_updated_by BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_by();

-- ============================================================
-- PHẦN TẠO INDEX HỖ TRỢ TỐI ƯU HÓA TRUY VẤN
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_rental_contracts_company ON public.rental_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_room ON public.rental_contracts(room_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_status ON public.rental_contracts(status);

CREATE INDEX IF NOT EXISTS idx_service_readings_company ON public.service_readings(company_id);
CREATE INDEX IF NOT EXISTS idx_service_readings_room ON public.service_readings(room_id);
CREATE INDEX IF NOT EXISTS idx_service_readings_period ON public.service_readings(period);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_room ON public.invoices(room_id);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON public.invoices(period);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
