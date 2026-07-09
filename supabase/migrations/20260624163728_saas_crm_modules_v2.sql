
-- ─── Companies ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  domain         TEXT,
  plan           TEXT NOT NULL DEFAULT 'starter'
                 CHECK (plan IN ('starter', 'professional', 'enterprise')),
  status         TEXT NOT NULL DEFAULT 'trial'
                 CHECK (status IN ('active', 'suspended', 'trial')),
  owner_name     TEXT NOT NULL,
  owner_email    TEXT NOT NULL,
  phone          TEXT,
  address        TEXT,
  total_users    INT NOT NULL DEFAULT 0,
  total_properties INT NOT NULL DEFAULT 0,
  trial_ends_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select" ON companies FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "companies_insert" ON companies FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "companies_update" ON companies FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "companies_delete" ON companies FOR DELETE
  TO authenticated USING (true);

-- ─── Leads ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  phone               TEXT NOT NULL,
  email               TEXT,
  source              TEXT NOT NULL DEFAULT 'website'
                      CHECK (source IN ('website','referral','social','cold_call','walk_in','other')),
  status              TEXT NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new','contacted','qualified','negotiating','won','lost')),
  interest            TEXT,
  budget              BIGINT DEFAULT 0,
  preferred_area      TEXT,
  preferred_room_type TEXT,
  assigned_to         UUID,
  notes               TEXT,
  last_contacted_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_select" ON leads FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "leads_insert" ON leads FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "leads_update" ON leads FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "leads_delete" ON leads FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

-- ─── Lead Timelines ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_timelines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type            TEXT NOT NULL DEFAULT 'note'
                  CHECK (type IN ('note','call','email','meeting','status_change','assignment')),
  content         TEXT NOT NULL,
  created_by      UUID,
  created_by_name TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lead_timelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_timelines_select" ON lead_timelines FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "lead_timelines_insert" ON lead_timelines FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "lead_timelines_update" ON lead_timelines FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lead_timelines_delete" ON lead_timelines FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_lead_timelines_lead ON lead_timelines(lead_id);

-- ─── Consultations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  message         TEXT NOT NULL,
  property_id     UUID,
  property_title  TEXT,
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','in_progress','resolved','closed')),
  assigned_to     UUID,
  assigned_to_name TEXT,
  source          TEXT NOT NULL DEFAULT 'website'
                  CHECK (source IN ('website','phone','email','walk_in')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultations_select" ON consultations FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "consultations_insert" ON consultations FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "consultations_update" ON consultations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "consultations_delete" ON consultations FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_consultations_company ON consultations(company_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'system'
               CHECK (type IN ('lead','appointment','contract','system','consultation')),
  is_read      BOOLEAN NOT NULL DEFAULT false,
  recipient_id UUID,
  link         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON notifications FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "notifications_delete" ON notifications FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ─── Activity Logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id      UUID,
  user_name    TEXT NOT NULL,
  action       TEXT NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT')),
  entity       TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  entity_label TEXT NOT NULL,
  detail       TEXT,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "activity_logs_update" ON activity_logs FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "activity_logs_delete" ON activity_logs FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_activity_logs_company ON activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- ─── Roles ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_system   BOOLEAN NOT NULL DEFAULT false,
  users_count INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select" ON roles FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "roles_insert" ON roles FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "roles_update" ON roles FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "roles_delete" ON roles FOR DELETE
  TO authenticated USING (true);

-- ─── KPIs ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kpis (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id            UUID,
  employee_name          TEXT NOT NULL,
  period                 TEXT NOT NULL,
  leads_assigned         INT NOT NULL DEFAULT 0,
  leads_converted        INT NOT NULL DEFAULT 0,
  appointments_completed INT NOT NULL DEFAULT 0,
  contracts_signed       INT NOT NULL DEFAULT 0,
  revenue_generated      BIGINT NOT NULL DEFAULT 0,
  target_revenue         BIGINT NOT NULL DEFAULT 0,
  score                  INT NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  status                 TEXT NOT NULL DEFAULT 'on_track'
                         CHECK (status IN ('on_track','behind','exceeded')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kpis_select" ON kpis FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "kpis_insert" ON kpis FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "kpis_update" ON kpis FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "kpis_delete" ON kpis FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_kpis_company ON kpis(company_id);
CREATE INDEX IF NOT EXISTS idx_kpis_employee ON kpis(employee_id);
CREATE INDEX IF NOT EXISTS idx_kpis_period ON kpis(period);
