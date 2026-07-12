# BƯỚC 3 — RLS cho nhóm bảng PII nhạy cảm nhất

Bước 2 đã xong và test ổn. Giờ làm bước này — đây là bước quan trọng nhất, làm cẩn thận, có thể chia làm 4 lần trả lời (mỗi bảng 1 lần) nếu bạn thấy cần, cứ hỏi tôi trước khi gộp.

## Phạm vi bảng (làm đúng thứ tự)
1. `profiles`
2. `companies`
3. `deposit_contracts`
4. `rental_contracts`
5. `tenant_invitations`

## Việc cần làm cho MỖI bảng
- Migration bật RLS + policy đầy đủ SELECT/INSERT/UPDATE/DELETE theo đúng "Quy tắc phân quyền" đã nêu ở bối cảnh nền (super_admin toàn quyền, company_admin/manager toàn quyền trong company, sales_agent giới hạn theo assigned_to/created_by, landlord chỉ SELECT theo landlord_id).
- Thêm `REVOKE ALL ON <table> FROM anon;` cho cả 5 bảng này (đều là PII nhạy cảm).
- Với `profiles`: chú ý user phải luôn SELECT được CHÍNH bản ghi của mình (để app đọc profile lúc login/session) dù role gì; và tuyệt đối KHÔNG cho phép SELECT cột `password_hash` qua policy — nếu Postgres RLS không tách được theo cột, đề xuất giải pháp (ví dụ: view riêng loại bỏ cột này cho các trường hợp không phải chính chủ/admin) và giải thích rõ trước khi code.
- Với `deposit_contracts`/`rental_contracts`: `sales_agent` chỉ thao tác được hợp đồng do mình tạo (`created_by = auth.uid()`); `company_admin`/`manager` toàn quyền trong company.
- Sau mỗi bảng: di chuyển repository tương ứng (nếu còn ở `lib/supabase/repositories/`) sang `src/features/<module>/services/` theo đúng ràng buộc #8 ở bối cảnh nền (giữ nguyên tên hàm export).

## Test thủ công cần hướng dẫn tôi làm
- Với mỗi bảng: test bằng ít nhất 2 role khác nhau + 2 company khác nhau, xác nhận đúng phạm vi thấy/sửa được.
- Xác nhận riêng: gọi thẳng Supabase REST API bằng anon key (không kèm JWT) từ Postman/curl — phải trả về rỗng hoặc lỗi 401/403 cho cả 5 bảng này.

## Output yêu cầu (cho mỗi bảng)
1. File migration đầy đủ.
2. File repository đã refactor (nếu có di chuyển).
3. Giải thích ngắn từng policy.
4. Hướng dẫn test theo 2 gạch đầu dòng ở trên.

Dừng lại sau khi xong cả 5 bảng và tôi xác nhận test ổn, rồi mới gửi Bước 4.
