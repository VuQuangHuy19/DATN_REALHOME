# Checklist tiến độ — Hardening RLS + Refactor

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
