# BƯỚC 5 — Seed RBAC chi tiết cho `sales_agent` + menu rút gọn

Toàn bộ RLS đã bật xong ở Bước 4. Đây là bước cuối, thiên về UX/phân quyền chi tiết hơn là bảo mật gốc (bảo mật gốc đã xong ở tầng DB).

## Việc cần làm
1. Dùng 3 bảng có sẵn `permissions` (module + action), `roles`, `role_permissions` — viết migration seed đúng quyền cho role `sales_agent`:
   - `leads.read`, `leads.update` (chỉ áp dụng cho bản ghi `assigned_to` = chính mình — RLS đã chặn tầng DB, đây là seed để UI ẩn/hiện nút đúng, không phải lớp bảo mật chính).
   - `appointments.read`, `appointments.update`.
   - `rooms.read` (KHÔNG seed `rooms.update`/`rooms.delete` cho role này).
   - `contracts.create` (áp dụng cho deposit và rental).
2. Sửa `components/admin/AdminSidebar.tsx`: thêm mảng `salesNavItems` riêng (không dùng chung `navItems` đầy đủ với company_admin/manager), gồm: Tổng quan, Khách hàng của tôi (leads), Lịch hẹn, Tra cứu phòng trống, Hợp đồng. Cập nhật logic chọn `currentNavItems` theo role (`landlord` → `landlordNavItems`, `sales_agent` → `salesNavItems`, còn lại → `navItems`).
3. Rà lại các trang `app/admin/customers/leads`, `app/admin/customers/appointments`, `app/admin/realhome/rooms` — với role `sales_agent`, ẩn bớt cột/nút không cần thiết (cột giá vốn, nút sửa/xoá tòa nhà...) bằng conditional render theo `role`, không tạo trang riêng mới để đỡ trùng lặp code.

## Test thủ công cần hướng dẫn tôi làm
- Tạo 1 tài khoản `sales_agent` test, đi hết luồng: đăng nhập → thấy menu rút gọn → nhận lead được gán → đặt lịch hẹn → tra phòng trống → tạo hợp đồng cọc → xác nhận không truy cập được các mục Nhân sự/Hệ thống.

## Output yêu cầu
1. File migration seed RBAC.
2. File `AdminSidebar.tsx` sau khi sửa (chỉ phần liên quan, không viết lại toàn bộ nếu không cần).
3. Danh sách các đoạn conditional render đã thêm vào 3 trang nêu trên.
4. Hướng dẫn test theo trên.

Đây là bước cuối cùng trong chuỗi 6 bước — sau bước này, báo tôi tổng kết ngắn gọn toàn bộ những gì đã thay đổi trong cả 6 bước để tôi lưu lại.
