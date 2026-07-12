# BƯỚC 2 — RLS thí điểm trên 1 bảng rủi ro thấp

Bước 1 đã xong và tôi đã xác nhận test thành công (claim JWT nhận đúng qua `auth.jwt()`). Giờ làm bước này.

## Việc cần làm
- Bật RLS thí điểm trên bảng **`notifications`** (chọn bảng này vì rủi ro thấp, ít bị ảnh hưởng nếu có sai sót, và có dùng Realtime nên test được luôn cả 2 việc cùng lúc).
- Viết migration file mới trong `supabase/migrations/` (đặt tên đúng convention `YYYYMMDDHHMMSS_enable_rls_notifications.sql`):
  - `ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;`
  - Policy SELECT: user chỉ thấy notification của mình (`recipient_id = auth.uid()`) HOẶC cùng company (tuỳ theo cách bảng này được dùng trong code — kiểm tra lại cách `recipient_id`/`company_id` được set khi insert notification trong code hiện tại trước khi viết policy, đừng đoán).
  - Policy INSERT: cho phép hệ thống/app tạo notification (nêu rõ giả định về ai được phép insert, ví dụ mọi user đã authenticated trong cùng company).
  - Không cần UPDATE/DELETE nếu code hiện tại không có thao tác này trên bảng — kiểm tra `lib/supabase/repositories/notifications.ts` (nếu còn ở vị trí cũ) trước khi quyết định.

## Test thủ công cần hướng dẫn tôi làm
- Đăng nhập bằng 2 tài khoản khác `company_id`, xác nhận mỗi tài khoản chỉ thấy notification của công ty/của chính mình.
- Xác nhận kênh Realtime (`postgres_changes` trên bảng `notifications`, nếu có) vẫn nhận được event đúng sau khi bật RLS — nếu KHÔNG nhận được nữa, dừng lại và báo tôi biết thay vì tự sửa policy Realtime mà không giải thích.

## Output yêu cầu
1. Nội dung đầy đủ file migration.
2. Giải thích ngắn gọn từng policy vì sao viết vậy (dựa trên cách bảng được dùng trong code thật, không suy đoán chung chung).
3. Hướng dẫn test theo đúng 2 gạch đầu dòng ở trên.

Dừng lại sau khi xong, chờ tôi xác nhận test xong rồi mới gửi Bước 3.
