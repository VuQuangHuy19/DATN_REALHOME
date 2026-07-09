-- Migration: Tạo bảng hành chính VN (global reference tables - no RLS)
-- vn_provinces, vn_districts, vn_wards

CREATE TABLE IF NOT EXISTS public.vn_provinces (
  id   text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.vn_districts (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  province_id text NOT NULL REFERENCES public.vn_provinces(id)
);

CREATE TABLE IF NOT EXISTS public.vn_wards (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  level       text NOT NULL, -- 'Phường' | 'Xã' | 'Thị trấn'
  district_id text NOT NULL REFERENCES public.vn_districts(id)
);

-- Cho phép đọc public (không cần auth)
ALTER TABLE public.vn_provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vn_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vn_wards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read vn_provinces" ON public.vn_provinces FOR SELECT USING (true);
CREATE POLICY "Public read vn_districts" ON public.vn_districts FOR SELECT USING (true);
CREATE POLICY "Public read vn_wards" ON public.vn_wards FOR SELECT USING (true);
