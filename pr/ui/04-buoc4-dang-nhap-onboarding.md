# BƯỚC 4 — Đăng nhập + Onboarding

## Phạm vi sửa
- `app/login/page.tsx`
- `app/onboarding/page.tsx`
- Các component trong `components/auth/` nếu chứa UI của form login (không đụng logic xác thực, không đụng `lib/auth-utils.ts`, không đụng cookie/JWT)

## Yêu cầu cụ thể
- Bố cục 2 khối trên desktop: bên trái là form (nền trắng), bên phải là khối thương hiệu/hình ảnh tĩnh minh hoạ sản phẩm (không dùng ảnh stock chung chung) — trên mobile chỉ hiện form, ẩn khối bên phải.
- Form login: giữ nguyên toàn bộ field, validate, gọi API hiện có. Chỉ chỉnh: khoảng cách, label phía trên input, nút submit primary full-width, trạng thái loading trên nút (spinner + disable) nếu code đã có state loading — không thêm state mới.
- Thông báo lỗi đăng nhập sai: hiển thị ngay trên form bằng banner nhạt màu `--danger`, giọng điệu rõ ràng không đổ lỗi người dùng.
- Onboarding (nếu là form nhiều bước tạo công ty/tài khoản đầu tiên): thêm chỉ báo tiến trình (progress) dạng đường kẻ mảnh/step number đơn giản nếu hiện tại có nhiều bước — dùng đúng field/logic bước hiện có, không thêm bước mới.

## Yêu cầu xuất ra
(a) Danh sách file sửa. (b) Nội dung đầy đủ từng file. (c) Hướng dẫn test: thử đăng nhập đúng/sai, thử flow onboarding từ đầu tới cuối, kiểm tra responsive mobile.

Chờ tôi xác nhận test xong rồi mới gửi Bước 5.
