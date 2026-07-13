# BƯỚC 9 — Cổng thông tin Chủ nhà (Landlord)

## Phạm vi sửa
- Toàn bộ `app/landlord/*` (appointments, buildings + `[id]`, contracts + `create`/`create-rental`/`[id]`, invoices, readings, rooms)

## Yêu cầu cụ thể
- Đây là vai trò chỉ có quyền SELECT (xem) hầu hết dữ liệu (theo đúng RLS đã áp dụng: landlord chỉ xem theo `landlord_id` của mình) — thiết kế nên nhấn mạnh tính chất "xem/theo dõi", các nút hành động (nếu có) phải rõ ràng đây là ngoại lệ được phép (ví dụ xác nhận lịch hẹn).
- Layout dùng chung khung sidebar/topbar đã chuẩn hoá ở Bước 1, nhưng menu items khác với admin — giữ nguyên đúng danh sách menu hiện có của landlord, không thêm/bớt mục.
- Trang chi tiết toà nhà/phòng/hợp đồng của landlord: tái sử dụng đúng cấu trúc hiển thị đã làm ở Bước 6/7 cho admin để đảm bảo nhất quán, chỉ ẩn các nút chỉnh sửa/xoá mà landlord không có quyền (giữ nguyên logic ẩn hiện hiện có theo `role`).

## Yêu cầu xuất ra
(a) Danh sách file sửa. (b) Nội dung đầy đủ từng file. (c) Hướng dẫn test: đăng nhập bằng 1 tài khoản `landlord`, đi hết các mục menu, xác nhận không thấy nút sửa/xoá ở nơi không được phép.

Chờ tôi xác nhận test xong rồi mới gửi Bước 10.
