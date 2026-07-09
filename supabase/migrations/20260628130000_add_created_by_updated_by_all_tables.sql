-- ============================================================
-- Migration: Thêm cột created_by, updated_by vào tất cả bảng nghiệp vụ
-- Tiêu chuẩn: mọi bảng nghiệp vụ phải có đủ 6 audit columns:
--   id, company_id, created_at, updated_at, created_by, updated_by
-- ============================================================

-- ─── BUILDINGS ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'buildings' AND column_name = 'created_by') THEN
    ALTER TABLE public.buildings ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'buildings' AND column_name = 'updated_by') THEN
    ALTER TABLE public.buildings ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── ROOMS ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'created_by') THEN
    ALTER TABLE public.rooms ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'updated_by') THEN
    ALTER TABLE public.rooms ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── LANDLORDS ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'landlords' AND column_name = 'created_by') THEN
    ALTER TABLE public.landlords ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'landlords' AND column_name = 'updated_by') THEN
    ALTER TABLE public.landlords ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── APPOINTMENTS ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'created_by') THEN
    ALTER TABLE public.appointments ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'updated_by') THEN
    ALTER TABLE public.appointments ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── CONTRACT_TEMPLATES ───────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contract_templates' AND column_name = 'created_by') THEN
    ALTER TABLE public.contract_templates ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contract_templates' AND column_name = 'updated_by') THEN
    ALTER TABLE public.contract_templates ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── EMPLOYEES ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'created_by') THEN
    ALTER TABLE public.employees ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'updated_by') THEN
    ALTER TABLE public.employees ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── LEADS ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'created_by') THEN
    ALTER TABLE public.leads ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'updated_by') THEN
    ALTER TABLE public.leads ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── CONSULTATIONS ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultations' AND column_name = 'created_by') THEN
    ALTER TABLE public.consultations ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultations' AND column_name = 'updated_by') THEN
    ALTER TABLE public.consultations ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── ROLES ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles' AND column_name = 'created_by') THEN
    ALTER TABLE public.roles ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles' AND column_name = 'updated_by') THEN
    ALTER TABLE public.roles ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── EMPLOYEE_KPIS ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_kpis' AND column_name = 'created_by') THEN
    ALTER TABLE public.employee_kpis ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_kpis' AND column_name = 'updated_by') THEN
    ALTER TABLE public.employee_kpis ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'created_by') THEN
    ALTER TABLE public.subscriptions ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'updated_by') THEN
    ALTER TABLE public.subscriptions ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── Auto-update updated_by trigger ──────────────────────────────────────────
-- Tạo function chung tự động set updated_by = auth.uid() khi UPDATE
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Áp dụng trigger cho tất cả bảng có updated_by
DO $$ 
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'buildings', 'rooms', 'landlords', 'appointments',
    'contract_templates', 'employees', 'leads', 'consultations',
    'roles', 'employee_kpis', 'subscriptions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_by ON public.%I; 
       CREATE TRIGGER trg_set_updated_by
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION set_updated_by();',
      tbl, tbl
    );
  END LOOP;
END $$;
