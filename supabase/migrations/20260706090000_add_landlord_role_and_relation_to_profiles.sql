-- Loại bỏ khóa ngoại liên kết tới auth.users để sử dụng UUID độc lập (Không phụ thuộc Supabase Auth)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Drop the existing role check constraint on profiles if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add a new check constraint that supports the 'landlord' role
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin', 'company_admin', 'manager', 'sales_agent', 'landlord'));

-- Add landlord_id column to profiles referencing public.landlords
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS landlord_id UUID REFERENCES public.landlords(id) ON DELETE SET NULL;

-- Insert 'landlord' role into the public.roles table for all existing companies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.companies LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.roles 
      WHERE company_id = r.id AND name = 'landlord'
    ) THEN
      INSERT INTO public.roles (company_id, name, description, permissions, is_system)
      VALUES (
        r.id,
        'landlord',
        'Vai trò Chủ nhà - Chỉ xem các tòa nhà và phòng sở hữu',
        ARRAY['buildings.read', 'rooms.read', 'contracts.read', 'invoices.read', 'services.read', 'reports.read'],
        true
      );
    END IF;
  END LOOP;
END $$;

