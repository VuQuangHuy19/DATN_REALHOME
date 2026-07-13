# BƯỚC 10 (cuối) — Super-admin (Quản trị toàn hệ thống REALHOME)

## Phạm vi sửa
- `app/super-admin/companies/*`
- `app/super-admin/plans/*`
- `app/super-admin/subscriptions/*`

## Yêu cầu cụ thể
- Đây là nơi REALHOME (chủ SaaS) quản lý TẤT CẢ công ty khách hàng — cần cảm giác "kiểm soát cấp cao", khác biệt nhẹ với `/admin` thường: dùng `--accent-900` (navy sâu) làm nền sidebar thay vì `--bg-subtle`, chữ menu trắng/xám nhạt, mục active có đường kẻ trái 2px màu `--accent-500` (sáng hơn để nổi trên nền tối) — để phân biệt rõ đây là khu vực quyền hạn cao nhất, vẫn theo đúng bảng màu/token đã định nghĩa, không thêm màu mới.
- Danh sách công ty (companies): mỗi công ty hiển thị plan, trạng thái (active/trial/suspended), tổng user, tổng bất động sản — dùng đúng field đã có trong bảng `companies`. Trạng thái `trial` nên hiển thị số ngày còn lại tính từ `trial_ends_at` nếu logic tính này đã tồn tại trong code (không tự viết logic tính ngày mới, chỉ hỏi tôi nếu chưa thấy chỗ tính sẵn).
- Gói dịch vụ (plans) + gói đăng ký (subscriptions): bảng giá dạng so sánh rõ ràng nếu là trang quản lý plan, hoặc bảng lịch sử subscription theo công ty — giữ nguyên toàn bộ field (`seats`, `price_per_month`, `status`...).

## Yêu cầu xuất ra
(a) Danh sách file sửa. (b) Nội dung đầy đủ từng file. (c) Hướng dẫn test: đăng nhập tài khoản `super_admin`, xem danh sách công ty, xem chi tiết 1 công ty, xem trang plans/subscriptions.

Đây là bước cuối cùng — sau khi test xong, toàn bộ hệ thống đã được redesign đồng bộ theo design system ở file 00.
