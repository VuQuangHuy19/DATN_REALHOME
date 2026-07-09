
-- ══════════════════════════════════════════════════════════════════════════════
-- RealHome Business — Multi-Tenant SaaS Full Migration
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── Subscriptions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL DEFAULT 'starter'
                  CHECK (plan IN ('starter','professional','enterprise')),
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','expired','cancelled','trial')),
  seats           INT NOT NULL DEFAULT 5,
  price_per_month BIGINT NOT NULL DEFAULT 0,
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at         TIMESTAMPTZ,
  trial_ends_at   TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_select" ON subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "subscriptions_insert" ON subscriptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "subscriptions_update" ON subscriptions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "subscriptions_delete" ON subscriptions FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);

-- ─── Permissions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module      TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('view','create','edit','delete','manage')),
  description TEXT,
  UNIQUE (module, action)
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions_select" ON permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "permissions_insert" ON permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "permissions_update" ON permissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permissions_delete" ON permissions FOR DELETE TO authenticated USING (true);

-- Seed built-in permissions
INSERT INTO permissions (module, action, description) VALUES
  ('buildings','view','Xem tòa nhà'),
  ('buildings','create','Tạo tòa nhà'),
  ('buildings','edit','Sửa tòa nhà'),
  ('buildings','delete','Xóa tòa nhà'),
  ('buildings','manage','Quản lý toàn bộ tòa nhà'),
  ('rooms','view','Xem phòng'),
  ('rooms','create','Tạo phòng'),
  ('rooms','edit','Sửa phòng'),
  ('rooms','delete','Xóa phòng'),
  ('rooms','manage','Quản lý toàn bộ phòng'),
  ('leads','view','Xem leads'),
  ('leads','create','Tạo lead'),
  ('leads','edit','Sửa lead'),
  ('leads','delete','Xóa lead'),
  ('leads','manage','Quản lý toàn bộ leads'),
  ('appointments','view','Xem lịch hẹn'),
  ('appointments','create','Tạo lịch hẹn'),
  ('appointments','edit','Sửa lịch hẹn'),
  ('appointments','delete','Xóa lịch hẹn'),
  ('appointments','manage','Quản lý toàn bộ lịch hẹn'),
  ('contracts','view','Xem hợp đồng'),
  ('contracts','create','Tạo hợp đồng'),
  ('contracts','edit','Sửa hợp đồng'),
  ('contracts','delete','Xóa hợp đồng'),
  ('contracts','manage','Quản lý toàn bộ hợp đồng'),
  ('landlords','view','Xem chủ nhà'),
  ('landlords','create','Tạo chủ nhà'),
  ('landlords','edit','Sửa chủ nhà'),
  ('landlords','delete','Xóa chủ nhà'),
  ('landlords','manage','Quản lý toàn bộ chủ nhà'),
  ('employees','view','Xem nhân viên'),
  ('employees','create','Tạo nhân viên'),
  ('employees','edit','Sửa nhân viên'),
  ('employees','delete','Xóa nhân viên'),
  ('employees','manage','Quản lý toàn bộ nhân viên'),
  ('reports','view','Xem báo cáo'),
  ('reports','manage','Quản lý báo cáo'),
  ('settings','view','Xem cài đặt'),
  ('settings','manage','Quản lý cài đặt')
ON CONFLICT (module, action) DO NOTHING;

-- ─── Role Permissions (join) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE (role_id, permission_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions_select" ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_permissions_insert" ON role_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "role_permissions_update" ON role_permissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "role_permissions_delete" ON role_permissions FOR DELETE TO authenticated USING (true);

-- ─── Lead Activities ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  type            TEXT NOT NULL DEFAULT 'note'
                  CHECK (type IN ('call','meeting','zalo','email','note','status_change')),
  content         TEXT NOT NULL,
  old_status      TEXT,
  new_status      TEXT,
  created_by      UUID,
  created_by_name TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_activities_select" ON lead_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "lead_activities_insert" ON lead_activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lead_activities_update" ON lead_activities FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lead_activities_delete" ON lead_activities FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_company ON lead_activities(company_id);

-- Update leads table with new columns if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='interested_area') THEN
    ALTER TABLE leads ADD COLUMN interested_area TEXT;
  END IF;
END $$;

-- ─── Employee KPIs (replace kpis if needed) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_kpis (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id          UUID,
  employee_name        TEXT NOT NULL,
  period               TEXT NOT NULL,
  total_leads          INT NOT NULL DEFAULT 0,
  total_appointments   INT NOT NULL DEFAULT 0,
  successful_deals     INT NOT NULL DEFAULT 0,
  conversion_rate      DECIMAL(5,2) NOT NULL DEFAULT 0,
  revenue_generated    BIGINT NOT NULL DEFAULT 0,
  target_revenue       BIGINT NOT NULL DEFAULT 0,
  score                INT NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  status               TEXT NOT NULL DEFAULT 'on_track'
                       CHECK (status IN ('on_track','behind','exceeded')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE employee_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employee_kpis_select" ON employee_kpis FOR SELECT TO authenticated USING (true);
CREATE POLICY "employee_kpis_insert" ON employee_kpis FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "employee_kpis_update" ON employee_kpis FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "employee_kpis_delete" ON employee_kpis FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_employee_kpis_company ON employee_kpis(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_kpis_employee ON employee_kpis(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_kpis_period ON employee_kpis(period);

-- ─── Profiles (extend for SaaS) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  full_name   TEXT,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'sales_agent'
              CHECK (role IN ('super_admin','company_admin','manager','sales_agent')),
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);
