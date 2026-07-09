-- ============================================================
-- Migration: Tạo bảng deposit_contracts (Hợp đồng đặt cọc thuê phòng)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deposit_contracts (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  room_id                   UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  
  -- Thông tin Hợp đồng
  contract_code             TEXT NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'draft' 
                            CHECK (status IN ('draft', 'active', 'signed', 'converted', 'cancelled', 'forfeited', 'refunded')),
  
  agreement_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  sign_location             TEXT,
  
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
  
  -- THỎA THUẬN TIỀN THUÊ & DỊCH VỤ (Điều 1)
  rent_price                NUMERIC NOT NULL DEFAULT 0,
  electricity_price         NUMERIC DEFAULT 4000,
  water_price               TEXT DEFAULT '150000/người/tháng',
  service_price             TEXT DEFAULT '200000/người/tháng',
  other_services            JSONB DEFAULT '{}'::jsonb,
  tenant_count              INTEGER DEFAULT 1,
  payment_method            TEXT,
  lease_duration_months     INTEGER DEFAULT 9,
  termination_notice_days   INTEGER DEFAULT 30,
  room_repair_support_date  DATE,
  
  -- THÔNG TIN ĐẶT CỌC (Điều 2)
  deposit_amount            NUMERIC NOT NULL DEFAULT 0,
  deadline_sign_contract    DATE NOT NULL,
  deposit_payment_type      TEXT DEFAULT 'transfer' CHECK (deposit_payment_type IN ('cash', 'transfer', 'both')),
  
  -- TÀI KHOẢN NHẬN TIỀN CỌC
  bank_name                 TEXT,
  bank_account_number       TEXT,
  bank_account_owner        TEXT,
  transfer_content_template TEXT,
  
  -- Ghi chú & Kiểm toán
  note                      TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Bật bảo mật Row Level Security (RLS)
ALTER TABLE public.deposit_contracts ENABLE ROW LEVEL SECURITY;

-- Tạo các chính sách cách ly bảo mật Multi-tenant
DROP POLICY IF EXISTS "deposit_contracts_select" ON public.deposit_contracts;
DROP POLICY IF EXISTS "deposit_contracts_insert" ON public.deposit_contracts;
DROP POLICY IF EXISTS "deposit_contracts_update" ON public.deposit_contracts;
DROP POLICY IF EXISTS "deposit_contracts_delete" ON public.deposit_contracts;

CREATE POLICY "deposit_contracts_select" ON public.deposit_contracts FOR SELECT TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

CREATE POLICY "deposit_contracts_insert" ON public.deposit_contracts FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "deposit_contracts_update" ON public.deposit_contracts FOR UPDATE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id())
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "deposit_contracts_delete" ON public.deposit_contracts FOR DELETE TO authenticated
  USING (auth_is_super_admin() OR company_id = auth_company_id());

-- Triggers tự động điền thông tin kiểm toán (created_by, updated_by)
DROP TRIGGER IF EXISTS trg_set_created_by ON public.deposit_contracts;
CREATE TRIGGER trg_set_created_by BEFORE INSERT ON public.deposit_contracts
  FOR EACH ROW EXECUTE FUNCTION set_created_by_and_updated_by();

DROP TRIGGER IF EXISTS trg_set_updated_by ON public.deposit_contracts;
CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.deposit_contracts
  FOR EACH ROW EXECUTE FUNCTION set_updated_by();

-- Tạo index hỗ trợ tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_deposit_contracts_company ON public.deposit_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_deposit_contracts_room ON public.deposit_contracts(room_id);
CREATE INDEX IF NOT EXISTS idx_deposit_contracts_status ON public.deposit_contracts(status);
