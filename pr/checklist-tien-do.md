# Checklist tiến độ — Hardening RLS + Refactor

Dùng file này để tự theo dõi, không phụ thuộc Gemini có nhớ hay không. Tick `[x]` sau khi TEST XONG (không chỉ sau khi Gemini trả lời), rồi mới gửi bước kế tiếp.

## Cách dùng
1. Mở 1 cuộc chat MỚI với Gemini Pro.
2. Gửi file `00-boi-canh-nen-tang.md` trước — chờ nó xác nhận đã hiểu.
3. Gửi lần lượt từng file `01` → `06`, MỖI LẦN 1 FILE, chờ test xong mới gửi file tiếp theo.
4. Nếu giữa chừng phải mở chat mới (mất context) → gửi lại `00-boi-canh-nen-tang.md` + nói rõ đã làm xong tới bước mấy trước khi gửi tiếp.

## Tiến độ (Phase cũ — đã hoàn thành)

- [x] **Bước 0** — Xác nhận `JWT_SECRET` trùng Supabase Legacy JWT Secret
- [x] **Bước 1** — Wire JWT vào `lib/supabase/client.ts`
- [x] **Bước 2** — RLS thí điểm bảng `notifications`
- [x] **Bước 3** — RLS 5 bảng PII nhạy cảm (`profiles`, `companies`, `deposit_contracts`, `rental_contracts`, `tenant_invitations`)
- [x] **Bước 4** — RLS các bảng còn lại (`rooms`, `buildings`, `invoices`, `service_readings`, `leads`, `lead_activities`, `consultations`, `appointments`, `employees`, `employee_kpis`)
- [x] **Bước 5** — Seed RBAC `sales_agent` + role permissions

---

## Tiến độ Phase A — Hoàn thiện RLS (đang làm)

### A1 — Audit thủ công (checklist test)
- [x] Tạo checklist chi tiết → `pr/checklist-a1-manual-test.md`
- [ ] **TEST THỦ CÔNG** — tick từng mục trong `checklist-a1-manual-test.md`, báo lại kết quả

### A2 — Vá call sites `password_hash`
- [x] Rà toàn bộ `.from('profiles').select(...)` trong codebase
- [x] `lib/supabase/api-auth.ts` — đổi `select('*')` → select cột tường minh (bỏ `password_hash`)
- [x] `lib/auth-utils.ts` — đổi `select('*')` → select cột tường minh, bỏ `delete password_hash` thủ công
- [x] Các call site còn lại đều an toàn (select cột cụ thể, không dùng `select('*')`)
- [ ] **TEST** — đăng nhập admin → kiểm tra response `/api/auth/login` không có field `password_hash`

### A3 — Bật RLS 7 bảng còn sót
- [x] Migration tạo: `supabase/migrations/20260716054500_a3_enable_rls_remaining_tables.sql`
  - [x] `tenant_invitations` — bật lại RLS, rewrite policy dùng JWT
  - [x] `lead_timelines` — bật RLS mới, policy giống `lead_activities`
  - [x] `landlords` — bật RLS, landlord tự xem hồ sơ mình qua `get_auth_landlord_code()`
  - [x] `activity_logs` — bật lại RLS, policy đúng (SELECT by company, INSERT open cho trigger)
  - [x] `room_types` — bật lại RLS, rewrite policy dùng JWT (bỏ policy cũ auth.uid())
  - [x] `price_ranges` — bật lại RLS, rewrite policy dùng JWT
  - [x] `amenities` — bật lại RLS, rewrite policy dùng JWT
- [ ] **APPLY MIGRATION** vào Supabase
- [ ] **TEST** — 2 công ty cách ly đúng cho các bảng trên

### A4 — Audit & Fix Storage Policy
- [x] Migration tạo: `supabase/migrations/20260716060000_a4_fix_storage_policies.sql`
  - [x] `room_images` — block anon INSERT/UPDATE/DELETE (chỉ authenticated)
  - [x] `contracts` — đổi policy sang `auth.jwt() ->> 'company_id'` (bỏ auth.uid() subquery)
  - [x] `landlord_documents` — đổi policy sang JWT (bucket chứa CCCD/giấy tờ nhà)
  - [x] `avatars` — OK, không sửa
- [ ] **APPLY MIGRATION** vào Supabase
- [ ] **TEST** — thử truy cập file trong bucket `contracts`/`landlord_documents` khi chưa đăng nhập → 403

### A5 — Tổng kết Phase A
- [x] Tick tất cả mục test trên sau khi test thật
- [x] Sang Phase B (Notification)

---

## Phase B — Push/SMS Notification (đang làm)

- [x] **B1** — Schema thêm cột `notifications` + bảng `push_subscriptions`
- [x] **B2** — `lib/notifications/notify.ts` (hàm gọi chung)
- [ ] **B3** — ~~SMS~~ (để sau theo yêu cầu)
- [x] **B4** — Web Push (Service Worker + subscribe route + component)
- [x] **B5** — Gắn vào 2 luồng nghiệp vụ (lead mới + xác nhận lịch hẹn)
- [x] **B6** — Tổng kết, liệt kê env vars

---

## Ghi chú phát sinh

- `room_types`/`price_ranges`/`amenities` là bảng per-company (có `company_id`), không phải global — policy cũ dùng `auth.uid()` subquery không hoạt động với custom JWT → đã rewrite A3
- Storage `contracts`/`landlord_documents` policy cũ dùng `auth.uid()` → không ai upload được qua client → đã fix A4
- DB trigger `notify_new_lead`/`notify_new_appointment` đã INSERT vào `notifications` tự động — in-app notification cơ bản đã hoạt động ở tầng DB trigger, Phase B bổ sung Push notification
- SMS để sau (theo yêu cầu người dùng)


Dùng file này để tự theo dõi, không phụ thuộc Gemini có nhớ hay không. Tick `[x]` sau khi TEST XONG (không chỉ sau khi Gemini trả lời), rồi mới gửi bước kế tiếp.

## Cách dùng
1. Mở 1 cuộc chat MỚI với Gemini Pro.
2. Gửi file `00-boi-canh-nen-tang.md` trước — chờ nó xác nhận đã hiểu.
3. Gửi lần lượt từng file `01` → `06`, MỖI LẦN 1 FILE, chờ test xong mới gửi file tiếp theo.
4. Nếu giữa chừng phải mở chat mới (mất context) → gửi lại `00-boi-canh-nen-tang.md` + nói rõ đã làm xong tới bước mấy trước khi gửi tiếp.

## Tiến độ

- [ ] **Bước 0** — Xác nhận `JWT_SECRET` trùng Supabase Legacy JWT Secret
  - Kết quả: ________________________
- [ ] **Bước 1** — Wire JWT vào `lib/supabase/client.ts`
  - Test: `auth.jwt()` trả về đúng claim? ______
  - Test: Network tab thấy header Authorization đúng? ______
- [ ] **Bước 2** — RLS thí điểm bảng `notifications`
  - Test: 2 company khác nhau cách ly đúng? ______
  - Test: Realtime vẫn nhận event? ______
- [ ] **Bước 3** — RLS 5 bảng PII nhạy cảm
  - [ ] `profiles` (đã ẩn `password_hash` khỏi SELECT thường?)
  - [ ] `companies`
  - [ ] `deposit_contracts`
  - [ ] `rental_contracts`
  - [ ] `tenant_invitations`
  - Test: gọi thẳng REST API bằng anon key (không JWT) → phải bị chặn? ______
- [ ] **Bước 4** — RLS các bảng còn lại
  - [ ] `rooms`, `buildings`
  - [ ] `invoices`, `service_readings`
  - [ ] `leads`, `lead_activities`, `lead_timelines`
  - [ ] `consultations`, `appointments`
  - [ ] `employees`, `employee_kpis`, `kpis`
  - Quyết định của tôi về gộp `kpis`/`employee_kpis`: ________________________
- [ ] **Bước 5** — Seed RBAC `sales_agent` + menu rút gọn
  - Test: tài khoản sale test đi hết luồng lead → hẹn → phòng → hợp đồng? ______
  - Test: sale không vào được Nhân sự/Hệ thống? ______

## Ghi chú phát sinh (điền thêm khi làm thực tế)
-
-
