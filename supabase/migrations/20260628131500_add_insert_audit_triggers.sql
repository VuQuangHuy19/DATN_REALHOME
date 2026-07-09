-- ============================================================
-- Migration: Tự động điền created_by và updated_by khi INSERT
-- ============================================================

-- Tạo function tự động set created_by và updated_by khi INSERT
CREATE OR REPLACE FUNCTION set_created_by_and_updated_by()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  IF NEW.updated_by IS NULL THEN
    NEW.updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Áp dụng trigger INSERT cho tất cả các bảng nghiệp vụ
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
      'DROP TRIGGER IF EXISTS trg_set_created_by ON public.%I; 
       CREATE TRIGGER trg_set_created_by
         BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION set_created_by_and_updated_by();',
      tbl, tbl
    );
  END LOOP;
END $$;
