-- ============================================================
-- Migration: Tạo bảng tenant_invitations (Lời mời onboarding công ty/tenant)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenant_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bật Row Level Security (RLS)
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách bảo mật (Chỉ cho phép Super Admin quản lý thông tin lời mời)
CREATE POLICY "tenant_invitations_super_admin_all" ON public.tenant_invitations
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
  );
