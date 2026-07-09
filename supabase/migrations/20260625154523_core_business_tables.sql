-- ─── BUILDINGS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.buildings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  name          TEXT NOT NULL,
  area          TEXT NOT NULL,
  address       TEXT,
  year_built    INTEGER,
  total_floors  INTEGER DEFAULT 1,
  total_rooms   INTEGER DEFAULT 0,
  description   TEXT,
  image_url     TEXT,
  landlord_id   UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buildings_select" ON public.buildings FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "buildings_insert" ON public.buildings FOR INSERT TO authenticated WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "buildings_update" ON public.buildings FOR UPDATE TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "buildings_delete" ON public.buildings FOR DELETE TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- ─── LANDLORDS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.landlords (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  notes           TEXT,
  properties_count INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "landlords_select" ON public.landlords FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "landlords_insert" ON public.landlords FOR INSERT TO authenticated WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "landlords_update" ON public.landlords FOR UPDATE TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "landlords_delete" ON public.landlords FOR DELETE TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- ─── ROOMS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  floor       INTEGER DEFAULT 1,
  room_type   TEXT,
  size        NUMERIC,
  price       NUMERIC DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','rented','maintenance','reserved')),
  bedrooms    INTEGER DEFAULT 0,
  bathrooms   INTEGER DEFAULT 1,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms_select" ON public.rooms FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT TO authenticated WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "rooms_delete" ON public.rooms FOR DELETE TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- ─── APPOINTMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT,
  customer_email    TEXT,
  room_id           UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  room_title        TEXT,
  date              DATE NOT NULL,
  time              TIME NOT NULL,
  area              TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  notes             TEXT,
  assigned_to       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to_name  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_select" ON public.appointments FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "appointments_insert" ON public.appointments FOR INSERT TO authenticated WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "appointments_update" ON public.appointments FOR UPDATE TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "appointments_delete" ON public.appointments FOR DELETE TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- ─── CONTRACT TEMPLATES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  content     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_select" ON public.contract_templates FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "contracts_insert" ON public.contract_templates FOR INSERT TO authenticated WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "contracts_update" ON public.contract_templates FOR UPDATE TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "contracts_delete" ON public.contract_templates FOR DELETE TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- ─── EMPLOYEES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  department  TEXT,
  position    TEXT,
  join_date   DATE,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "employees_insert" ON public.employees FOR INSERT TO authenticated WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "employees_update" ON public.employees FOR UPDATE TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "employees_delete" ON public.employees FOR DELETE TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
