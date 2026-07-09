-- ============================================================
-- SEED DATA v4: All constraints validated
-- ============================================================

DO $$
DECLARE
  v_company_a_id uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_company_b_id uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
  v_sub_a_id     uuid := 'aaaaaaaa-0000-0000-0000-000000000010';
  v_sub_b_id     uuid := 'bbbbbbbb-0000-0000-0000-000000000010';
  v_bld_a1_id    uuid := 'aaaaaaaa-0000-0000-0000-000000000020';
  v_bld_a2_id    uuid := 'aaaaaaaa-0000-0000-0000-000000000021';
  v_bld_b1_id    uuid := 'bbbbbbbb-0000-0000-0000-000000000020';
  v_land_a_id    uuid := 'aaaaaaaa-0000-0000-0000-000000000030';
  v_land_b_id    uuid := 'bbbbbbbb-0000-0000-0000-000000000030';
  v_room_a1_id   uuid := 'aaaaaaaa-0000-0000-0000-000000000040';
  v_room_a2_id   uuid := 'aaaaaaaa-0000-0000-0000-000000000041';
  v_room_a3_id   uuid := 'aaaaaaaa-0000-0000-0000-000000000042';
  v_room_b1_id   uuid := 'bbbbbbbb-0000-0000-0000-000000000040';
  v_room_b2_id   uuid := 'bbbbbbbb-0000-0000-0000-000000000041';
  v_lead_a1_id   uuid := 'aaaaaaaa-0000-0000-0000-000000000050';
  v_lead_a2_id   uuid := 'aaaaaaaa-0000-0000-0000-000000000051';
  v_lead_b1_id   uuid := 'bbbbbbbb-0000-0000-0000-000000000050';
  v_lead_b2_id   uuid := 'bbbbbbbb-0000-0000-0000-000000000051';
  v_apt_a1_id    uuid := 'aaaaaaaa-0000-0000-0000-000000000060';
  v_apt_b1_id    uuid := 'bbbbbbbb-0000-0000-0000-000000000060';
  v_consult_a_id uuid := 'aaaaaaaa-0000-0000-0000-000000000070';
  v_consult_b_id uuid := 'bbbbbbbb-0000-0000-0000-000000000070';
  v_contract_a_id uuid := 'aaaaaaaa-0000-0000-0000-000000000080';
  v_contract_b_id uuid := 'bbbbbbbb-0000-0000-0000-000000000080';
  v_emp_a_id     uuid := 'aaaaaaaa-0000-0000-0000-000000000090';
  v_emp_b_id     uuid := 'bbbbbbbb-0000-0000-0000-000000000090';
BEGIN

INSERT INTO companies (id, name, domain, plan, status, owner_name, owner_email, phone, address, total_users, total_properties, created_at, updated_at)
VALUES
  (v_company_a_id, 'RealHome Quận 1', 'realhome-q1.vn', 'professional', 'active',
   'Nguyễn Minh Tuấn', 'admin@realhome-q1.vn', '028-1111-0001',
   '10 Nguyễn Huệ, Quận 1, TP.HCM', 5, 12, NOW(), NOW()),
  (v_company_b_id, 'SkyNest Thảo Điền', 'skynest-thaodien.vn', 'starter', 'trial',
   'Trần Thị Lan', 'admin@skynest.vn', '028-2222-0002',
   '45 Xuân Thủy, Quận 2, TP.HCM', 3, 6, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscriptions (id, company_id, plan, status, seats, price_per_month, starts_at, ends_at, created_at, updated_at)
VALUES
  (v_sub_a_id, v_company_a_id, 'professional', 'active', 10, 1990000,
   NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days', NOW(), NOW()),
  (v_sub_b_id, v_company_b_id, 'starter', 'trial', 3, 690000,
   NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO landlords (id, company_id, name, phone, email, address, notes, properties_count, created_at, updated_at)
VALUES
  (v_land_a_id, v_company_a_id, 'Ông Phạm Văn Đức', '0901-111-222', 'pvduc@email.vn',
   '123 Lý Tự Trọng, Q1', 'Chủ nhà uy tín, nhiều BDS cao cấp', 2, NOW(), NOW()),
  (v_land_b_id, v_company_b_id, 'Bà Lê Thị Hoa', '0902-333-444', 'lthoa@email.vn',
   '88 Xuân Thủy, Q2', 'Chủ nhà Thảo Điền, expat-friendly', 1, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO buildings (id, company_id, code, name, area, address, year_built, total_floors, total_rooms, description, image_url, landlord_id, created_at, updated_at)
VALUES
  (v_bld_a1_id, v_company_a_id, 'BLD-A01', 'Sunrise Tower Q1', 'Quận 1',
   '10 Nguyễn Huệ, Quận 1, TP.HCM', 2019, 25, 80,
   'Tòa nhà cao cấp trung tâm Quận 1, view sông Sài Gòn',
   'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg',
   v_land_a_id, NOW(), NOW()),
  (v_bld_a2_id, v_company_a_id, 'BLD-A02', 'The Grand Residence', 'Quận 1',
   '55 Phạm Ngọc Thạch, Quận 1, TP.HCM', 2021, 18, 45,
   'Căn hộ dịch vụ cao cấp, đầy đủ tiện ích',
   'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg',
   v_land_a_id, NOW(), NOW()),
  (v_bld_b1_id, v_company_b_id, 'BLD-B01', 'SkyNest Thảo Điền', 'Quận 2 (Thảo Điền)',
   '88 Xuân Thủy, Quận 2, TP.HCM', 2020, 15, 60,
   'Khu dân cư expat Thảo Điền, hồ bơi, gym',
   'https://images.pexels.com/photos/2102587/pexels-photo-2102587.jpeg',
   v_land_b_id, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO rooms (id, company_id, building_id, code, floor, room_type, size, price, status, bedrooms, bathrooms, description, created_at, updated_at)
VALUES
  (v_room_a1_id, v_company_a_id, v_bld_a1_id, 'A1-0501', 5, '1 Phòng ngủ', 45.0, 18000000,
   'available', 1, 1, 'View thành phố, nội thất cao cấp', NOW(), NOW()),
  (v_room_a2_id, v_company_a_id, v_bld_a1_id, 'A1-1202', 12, '2 Phòng ngủ', 75.0, 32000000,
   'rented', 2, 2, 'View sông Sài Gòn, bếp hiện đại', NOW(), NOW()),
  (v_room_a3_id, v_company_a_id, v_bld_a2_id, 'A2-0301', 3, 'Studio', 28.0, 9500000,
   'available', 0, 1, 'Studio tiện nghi, gần trung tâm', NOW(), NOW()),
  (v_room_b1_id, v_company_b_id, v_bld_b1_id, 'B1-0801', 8, '2 Phòng ngủ', 80.0, 28000000,
   'available', 2, 2, 'Expat-friendly, full furnished, pool view', NOW(), NOW()),
  (v_room_b2_id, v_company_b_id, v_bld_b1_id, 'B1-0303', 3, '1 Phòng ngủ', 50.0, 16000000,
   'rented', 1, 1, 'Phòng sáng, gần trường quốc tế', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO leads (id, company_id, full_name, phone, email, source, status, interest, budget, preferred_area, preferred_room_type, assigned_to, notes, created_at, updated_at)
VALUES
  (v_lead_a1_id, v_company_a_id, 'Nguyễn Thị Mai', '0912-001-001', 'ntmai@gmail.com',
   'website', 'new', '2 Phòng ngủ, Quận 1', 35000000, 'Quận 1', '2 Phòng ngủ',
   NULL, 'Tìm căn hộ cao cấp gần trung tâm', NOW() - INTERVAL '2 days', NOW()),
  (v_lead_a2_id, v_company_a_id, 'Trần Văn Hùng', '0913-002-002', 'tvhung@gmail.com',
   'social', 'contacted', 'Studio, Quận 1', 10000000, 'Quận 1', 'Studio',
   NULL, 'Sinh viên cần phòng nhỏ giá tốt', NOW() - INTERVAL '5 days', NOW()),
  (v_lead_b1_id, v_company_b_id, 'John Smith', '0914-003-003', 'jsmith@expat.com',
   'referral', 'new', '2 Phòng ngủ, Thảo Điền', 30000000, 'Quận 2 (Thảo Điền)', '2 Phòng ngủ',
   NULL, 'Expat needs English-speaking service, pool required', NOW() - INTERVAL '1 day', NOW()),
  (v_lead_b2_id, v_company_b_id, 'Sarah Johnson', '0915-004-004', 'sjohnson@expat.com',
   'website', 'qualified', 'Penthouse, Thảo Điền', 60000000, 'Quận 2 (Thảo Điền)', 'Penthouse',
   NULL, 'Looking for premium unit with city view', NOW() - INTERVAL '10 days', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO appointments (id, company_id, customer_name, customer_phone, customer_email, room_id, room_title, date, time, area, status, notes, assigned_to, assigned_to_name, created_at, updated_at)
VALUES
  (v_apt_a1_id, v_company_a_id, 'Nguyễn Thị Mai', '0912-001-001', 'ntmai@gmail.com',
   v_room_a1_id, 'A1-0501 - 1PN Sunrise Tower', '2026-06-28', '10:00',
   'Quận 1', 'pending', 'Khách cần xem phòng buổi sáng', NULL, NULL, NOW(), NOW()),
  (v_apt_b1_id, v_company_b_id, 'John Smith', '0914-003-003', 'jsmith@expat.com',
   v_room_b1_id, 'B1-0801 - 2PN SkyNest Thảo Điền', '2026-06-27', '14:00',
   'Quận 2 (Thảo Điền)', 'confirmed', 'English preferred', NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO consultations (id, company_id, full_name, phone, email, message, status, source, created_at, updated_at)
VALUES
  (v_consult_a_id, v_company_a_id, 'Phạm Thị Dung', '0916-005-005', 'ptdung@gmail.com',
   'Tôi muốn thuê căn hộ 2PN khu trung tâm, ngân sách 30-35 triệu/tháng',
   'new', 'website', NOW() - INTERVAL '6 hours', NOW()),
  (v_consult_b_id, v_company_b_id, 'Michael Lee', '0917-006-006', 'mlee@expat.com',
   'Looking for furnished 1BR near international school, budget $1500/month',
   'new', 'website', NOW() - INTERVAL '3 hours', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO contract_templates (id, company_id, name, type, content, created_at, updated_at)
VALUES
  (v_contract_a_id, v_company_a_id, 'Hợp đồng thuê căn hộ dịch vụ 2026', 'standard',
   'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM... [Mẫu hợp đồng Công ty A]', NOW(), NOW()),
  (v_contract_b_id, v_company_b_id, 'SkyNest Serviced Apartment Lease 2026', 'standard',
   'LEASE AGREEMENT... [SkyNest Template for Expat Tenants]', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO employees (id, company_id, name, email, phone, department, position, join_date, status, created_at, updated_at)
VALUES
  (v_emp_a_id, v_company_a_id, 'Lê Thị Hương', 'huong.le@realhome-q1.vn', '0918-007-007',
   'Kinh doanh', 'Chuyên viên tư vấn', '2024-01-15', 'active', NOW(), NOW()),
  (v_emp_b_id, v_company_b_id, 'Võ Minh Khoa', 'khoa.vo@skynest.vn', '0919-008-008',
   'Sales', 'Senior Sales Executive', '2023-06-01', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO lead_activities (lead_id, company_id, type, content, old_status, new_status, created_by, created_by_name, created_at)
VALUES
  (v_lead_a1_id, v_company_a_id, 'note', 'Lead từ website, quan tâm căn 2PN Quận 1', NULL, NULL, NULL, 'Website', NOW() - INTERVAL '2 days'),
  (v_lead_a2_id, v_company_a_id, 'note', 'Lead từ Social Media, sinh viên ngân sách thấp', NULL, NULL, NULL, 'Website', NOW() - INTERVAL '5 days'),
  (v_lead_b1_id, v_company_b_id, 'note', 'Expat referral, high priority', NULL, NULL, NULL, 'Website', NOW() - INTERVAL '1 day'),
  (v_lead_b2_id, v_company_b_id, 'status_change', 'Chuyển trạng thái: new → qualified', 'new', 'qualified', NULL, 'System', NOW() - INTERVAL '8 days');

-- Manual notifications (supplementing trigger-generated ones from leads/appointments inserts above)
-- The lead/appointment INSERTs already fired triggers that created notifications
-- These are additional ones seeded directly
INSERT INTO notifications (company_id, title, body, type, is_read, recipient_id, link, created_at)
VALUES
  (v_company_a_id, 'Hợp đồng mới: Hợp đồng thuê 2026',
   'Mẫu hợp đồng mới đã được tạo: Hợp đồng thuê căn hộ dịch vụ 2026',
   'contract', true, NULL, '/admin/contracts', NOW() - INTERVAL '1 day'),
  (v_company_b_id, 'Hợp đồng mới: SkyNest Lease 2026',
   'Mẫu hợp đồng mới đã được tạo: SkyNest Serviced Apartment Lease 2026',
   'contract', false, NULL, '/admin/contracts', NOW());

-- Activity logs (trigger already created entries from leads/buildings/appointments inserts)
-- Adding a few historical ones for fuller dashboard view
INSERT INTO activity_logs (company_id, user_name, action, entity, entity_id, entity_label, detail, created_at)
VALUES
  (v_company_a_id, 'System', 'UPDATE', 'leads', v_lead_a2_id::text, 'Trần Văn Hùng',
   'Trạng thái lead Trần Văn Hùng: new → contacted', NOW() - INTERVAL '4 days'),
  (v_company_b_id, 'System', 'UPDATE', 'leads', v_lead_b2_id::text, 'Sarah Johnson',
   'Trạng thái lead Sarah Johnson: new → qualified', NOW() - INTERVAL '8 days');

END $$;
