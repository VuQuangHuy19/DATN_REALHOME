-- Migration: Tạo bảng danh mục thực (price_ranges, amenities, room_types)
-- Thay thế dữ liệu tĩnh từ mock-data.ts đã bị xóa

CREATE TABLE IF NOT EXISTS public.price_ranges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  label      text NOT NULL,
  min        bigint NOT NULL DEFAULT 0,
  max        bigint,           -- NULL = không giới hạn trên
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.amenities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name       text NOT NULL,
  icon       text,             -- tên icon lucide hoặc emoji
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.room_types (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- RLS: chỉ xem/sửa data của company mình
ALTER TABLE public.price_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types   ENABLE ROW LEVEL SECURITY;

-- price_ranges
CREATE POLICY "price_ranges: company isolation select" ON public.price_ranges
  FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "price_ranges: company isolation insert" ON public.price_ranges
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "price_ranges: company isolation update" ON public.price_ranges
  FOR UPDATE USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "price_ranges: company isolation delete" ON public.price_ranges
  FOR DELETE USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- amenities
CREATE POLICY "amenities: company isolation select" ON public.amenities
  FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "amenities: company isolation insert" ON public.amenities
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "amenities: company isolation update" ON public.amenities
  FOR UPDATE USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "amenities: company isolation delete" ON public.amenities
  FOR DELETE USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- room_types
CREATE POLICY "room_types: company isolation select" ON public.room_types
  FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "room_types: company isolation insert" ON public.room_types
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "room_types: company isolation update" ON public.room_types
  FOR UPDATE USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "room_types: company isolation delete" ON public.room_types
  FOR DELETE USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
