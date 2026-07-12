# BƯỚC 4 — RLS cho toàn bộ bảng nghiệp vụ còn lại

Bước 3 đã xong, 5 bảng PII nhạy cảm nhất đã an toàn. Giờ làm nốt các bảng còn lại — có thể chia nhỏ theo nhóm, hỏi tôi trước nếu bạn muốn tách thêm.

## Phạm vi bảng
`rooms`, `buildings`, `invoices`, `service_readings`, `leads`, `lead_activities`, `lead_timelines`, `consultations`, `appointments`, `employees`, `employee_kpis`, `kpis`.

## Lưu ý riêng trước khi làm
- `kpis` và `employee_kpis` có vẻ là 2 bảng trùng chức năng (đã phát hiện trước đó). KHÔNG tự ý xoá/gộp bảng nào — chỉ báo tôi lại danh sách cột khác nhau giữa 2 bảng và ĐỀ XUẤT hướng gộp, chờ tôi quyết định. Ở bước này chỉ cần bật RLS cho cả 2 bảng như hiện trạng.
- `rooms`, `buildings` có `landlord_id` kiểu `text` — khi viết policy so sánh với `auth.uid()` (kiểu uuid), phải ép kiểu đúng (`auth.uid()::text = landlord_id` hoặc ngược lại), kiểm tra kỹ tránh lỗi so sánh kiểu.
- `leads`, `appointments`: áp policy `sales_agent` giới hạn theo `assigned_to`/`created_by` như đã nêu trong quy tắc phân quyền.

## Việc cần làm cho mỗi bảng
- Migration bật RLS + policy đầy đủ theo đúng quy tắc phân quyền ở bối cảnh nền.
- Di chuyển repository tương ứng sang `src/features/<module>/services/` nếu còn ở vị trí cũ.

## Test thủ công cần hướng dẫn tôi làm
- Test bằng tài khoản `sales_agent` thật: xác nhận thấy đúng lead/appointment được gán cho mình, KHÔNG thấy của sale khác; xem được danh sách phòng trống nhưng không sửa/xoá được.
- Test Realtime trên `appointments` (đã có migration bật realtime RLS riêng cho bảng này từ trước — kiểm tra lại chưa bị policy mới chặn nhầm).

## Output yêu cầu
Giống Bước 3: file migration đầy đủ + file repository refactor + giải thích + hướng dẫn test, cho từng bảng hoặc từng nhóm bảng bạn chia.

Dừng lại sau khi xong và tôi xác nhận ổn, rồi mới gửi Bước 5.
