-- ============================================================
-- Migration: Create Storage Buckets + RLS Policies
-- File: 20260629010000_create_storage_buckets.sql
-- Project: RealHome Business
-- ============================================================

-- ============================================================
-- SECTION 1: TẠO BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'room_images',
    'room_images',
    TRUE,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'avatars',
    'avatars',
    TRUE,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'contracts',
    'contracts',
    FALSE,
    20971520, -- 20 MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
  ),
  (
    'landlord_documents',
    'landlord_documents',
    FALSE,
    20971520, -- 20 MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SECTION 2: RLS — PUBLIC BUCKET: room_images
-- ============================================================

-- SELECT: anon + authenticated đều đọc được
CREATE POLICY "room_images: public select"
ON storage.objects FOR SELECT
USING (bucket_id = 'room_images');

-- INSERT: chỉ authenticated
CREATE POLICY "room_images: authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'room_images');

-- UPDATE: chỉ authenticated
CREATE POLICY "room_images: authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'room_images');

-- DELETE: chỉ authenticated
CREATE POLICY "room_images: authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'room_images');


-- ============================================================
-- SECTION 3: RLS — PUBLIC BUCKET: avatars
-- ============================================================

-- SELECT: anon + authenticated đều đọc được
CREATE POLICY "avatars: public select"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- INSERT: chỉ authenticated
CREATE POLICY "avatars: authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- UPDATE: chỉ authenticated
CREATE POLICY "avatars: authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- DELETE: chỉ authenticated
CREATE POLICY "avatars: authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');


-- ============================================================
-- SECTION 4: RLS — PRIVATE BUCKET: contracts
-- Điều kiện: file phải nằm trong thư mục mang tên company_id của user.
-- Đường dẫn file mẫu: {company_id}/contract_abc.pdf
-- Split path: (string_to_array(name, '/'))[1] = company_id của user
-- ============================================================

-- SELECT: authenticated, chỉ file trong company_id của mình
CREATE POLICY "contracts: authenticated select own company"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contracts'
  AND (string_to_array(name, '/'))[1] = (
    SELECT company_id::text
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1
  )
);

-- INSERT: authenticated, chỉ upload vào folder company_id của mình
CREATE POLICY "contracts: authenticated insert own company"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contracts'
  AND (string_to_array(name, '/'))[1] = (
    SELECT company_id::text
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1
  )
);

-- UPDATE: authenticated, chỉ file trong company_id của mình
CREATE POLICY "contracts: authenticated update own company"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contracts'
  AND (string_to_array(name, '/'))[1] = (
    SELECT company_id::text
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1
  )
);

-- DELETE: authenticated, chỉ file trong company_id của mình
CREATE POLICY "contracts: authenticated delete own company"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contracts'
  AND (string_to_array(name, '/'))[1] = (
    SELECT company_id::text
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1
  )
);


-- ============================================================
-- SECTION 5: RLS — PRIVATE BUCKET: landlord_documents
-- Điều kiện: file phải nằm trong thư mục mang tên company_id của user.
-- Đường dẫn file mẫu: {company_id}/landlord_doc_abc.pdf
-- ============================================================

-- SELECT: authenticated, chỉ file trong company_id của mình
CREATE POLICY "landlord_documents: authenticated select own company"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'landlord_documents'
  AND (string_to_array(name, '/'))[1] = (
    SELECT company_id::text
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1
  )
);

-- INSERT: authenticated, chỉ upload vào folder company_id của mình
CREATE POLICY "landlord_documents: authenticated insert own company"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'landlord_documents'
  AND (string_to_array(name, '/'))[1] = (
    SELECT company_id::text
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1
  )
);

-- UPDATE: authenticated, chỉ file trong company_id của mình
CREATE POLICY "landlord_documents: authenticated update own company"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'landlord_documents'
  AND (string_to_array(name, '/'))[1] = (
    SELECT company_id::text
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1
  )
);

-- DELETE: authenticated, chỉ file trong company_id của mình
CREATE POLICY "landlord_documents: authenticated delete own company"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'landlord_documents'
  AND (string_to_array(name, '/'))[1] = (
    SELECT company_id::text
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1
  )
);
