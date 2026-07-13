# BƯỚC 5 — Admin: Tổng quan (Dashboard) + Khách hàng (Leads / Lịch hẹn / Tư vấn)

## Phạm vi sửa
- `app/admin/page.tsx` (Tổng quan)
- `app/admin/customers/leads/page.tsx`
- `app/admin/customers/appointments/page.tsx`
- `app/admin/customers/consultations/page.tsx`
- (Nếu tồn tại) `app/admin/appointments/page.tsx` — kiểm tra xem có phải trùng/route cũ không dùng nữa, nếu trùng thì báo lại cho tôi trước khi sửa cả 2.

## Yêu cầu cụ thể
### Tổng quan
- Các thẻ KPI (tổng khách, tổng phòng, doanh thu...) dùng số lớn font Space Grotesk, label nhỏ `--ink-muted` phía trên, không dùng icon tràn lan mỗi thẻ 1 icon màu khác nhau — chỉ 1 icon nhỏ, cùng tông `--ink-muted`, trừ đúng 1 thẻ quan trọng nhất được nhấn accent.
- Nếu có biểu đồ (dùng `recharts` đã cài sẵn): line/bar đơn sắc theo `--accent`, lưới nền rất nhạt, bỏ hiệu ứng 3D/gradient trên chart.

### Leads / Lịch hẹn / Tư vấn (3 trang có cấu trúc bảng tương tự nhau)
- Giữ nguyên toàn bộ cột dữ liệu, filter, search, phân trang, dialog xem/sửa hiện có — chỉ redesign UI bảng theo token ở Bước 1 (header uppercase nhạt, hàng cách viền mảnh, hover nhẹ `--bg-subtle`).
- Banner "Chỉ hiển thị ... được phân công cho bạn" (hiện có cho `sales_agent`) giữ nguyên logic điều kiện, chỉ đổi style thành banner nhạt viền `--accent`.
- Dialog xem chi tiết/sửa trạng thái: bố cục rõ ràng theo nhóm thông tin, nút chọn trạng thái dạng segmented list như hiện có nhưng theo màu semantic ở file 00.
- Action icon trong bảng (xem/sửa/copy/xoá): dùng `ghost` button đã chuẩn hoá ở Bước 1, giữ đúng icon `lucide-react` hiện tại.

## Yêu cầu xuất ra
(a) Danh sách file sửa. (b) Nội dung đầy đủ từng file. (c) Hướng dẫn test: đăng nhập bằng tài khoản `company_admin` và bằng tài khoản `sales_agent`, so sánh 2 trang lịch hẹn/lead hiển thị đúng theo phân quyền, kiểm tra responsive.

Chờ tôi xác nhận test xong rồi mới gửi Bước 6.
