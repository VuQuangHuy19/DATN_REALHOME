# BƯỚC 6 — Admin: Bất động sản (Toà nhà / Phòng / Chủ nhà)

## Phạm vi sửa
- `app/admin/realhome/buildings/page.tsx` + `app/admin/realhome/buildings/[id]/page.tsx`
- `app/admin/realhome/rooms/page.tsx` + `app/admin/realhome/rooms/[id]/page.tsx`
- `app/admin/landlords/page.tsx`
- `app/admin/categories/page.tsx` (loại phòng/tiện ích/khoảng giá — nếu đây là trang quản lý danh mục dùng chung)

## Yêu cầu cụ thể
- Danh sách toà nhà/phòng: cho phép chuyển đổi giữa dạng lưới card (ảnh + thông tin, phù hợp xem nhanh) và dạng bảng (phù hợp thao tác hàng loạt) NẾU code hiện tại đã có 2 chế độ này — chỉ redesign, không tự thêm tính năng chuyển đổi mới nếu chưa từng có.
- Trang chi tiết toà nhà/phòng: bố cục dạng tab hoặc section rõ ràng (thông tin chung / tiện ích / hình ảnh / phòng thuộc toà nhà) — giữ nguyên cấu trúc dữ liệu và field hiện có, chỉ nhóm lại về mặt hiển thị cho gọn gàng nếu hiện tại đang dồn hết vào 1 khối dài.
- Rất nhiều field boolean tiện ích (thang máy, PCCC, cho thú cưng, máy lạnh...) — hiển thị dạng lưới icon on/off nhỏ gọn thay vì danh sách checkbox dài dòng, dùng đúng tên field hiện có.
- Chủ nhà (landlords): card/bảng đơn giản gồm mã, tên, SĐT, số bất động sản đang quản lý — click vào xem chi tiết (giữ nguyên route/logic).

## Yêu cầu xuất ra
(a) Danh sách file sửa. (b) Nội dung đầy đủ từng file. (c) Hướng dẫn test: xem danh sách + chi tiết 1 toà nhà, 1 phòng, 1 chủ nhà, thử tạo/sửa nếu có form, kiểm tra responsive.

Chờ tôi xác nhận test xong rồi mới gửi Bước 7.
