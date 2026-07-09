-- ============================================================
-- Migration: Fix public.handle_new_user() trigger to include email column
-- File: 20260709150000_fix_auth_profiles_trigger_email.sql
-- ============================================================

-- Cập nhật hàm trigger để sao chép thêm cột email từ auth.users vào public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'sales_agent'),
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;
