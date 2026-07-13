# BƯỚC 2 — Trang khách hàng: Trang chủ + Danh sách phòng

## Phạm vi sửa
- `app/customer/page.tsx` (trang chủ public)
- `app/customer/properties/page.tsx` (danh sách phòng/bộ lọc)
- `app/customer/layout.tsx` (header/footer public, nếu chứa JSX header — chỉ sửa phần hiển thị)

## Yêu cầu cụ thể
### Trang chủ
- Hero: mở đầu bằng đúng 1 thứ đặc trưng nhất của sản phẩm — ảnh/khối hiển thị phòng thật (không dùng ảnh stock generic kiểu "gia đình hạnh phúc"), tiêu đề ngắn bằng Space Grotesk cỡ lớn, 1 câu mô tả, 1 nút CTA chính (primary, accent) dẫn tới `/customer/properties`. Không dùng bố cục "big number + gradient" mặc định.
- Thanh tìm kiếm nhanh (khu vực, mức giá, loại phòng) đặt nổi bật ngay dưới hero, dùng lại các dữ liệu lọc đã có sẵn trong code (không tạo field lọc mới).
- Phần liệt kê nổi bật (nếu code hiện tại có "phòng nổi bật"/"khu vực phổ biến") — giữ nguyên data, chỉ đổi UI thành dạng lưới card sạch, viền mảnh, ảnh tỉ lệ nhất quán.

### Danh sách phòng
- Bộ lọc (khu vực, giá, loại phòng...) dùng lại state/filter logic hiện có — chuyển UI sang dạng thanh lọc ngang gọn (desktop) / drawer trượt lên (mobile), không đổi tên state hay logic lọc.
- Card phòng: ảnh, giá (font JetBrains Mono cho số), khu vực, diện tích, badge loại phòng — layout lưới responsive (1 cột mobile, 2 cột tablet, 3–4 cột desktop).
- Trạng thái rỗng ("không tìm thấy phòng phù hợp") viết lại theo giọng điệu ở file 00: giải thích + gợi ý hành động (nới bộ lọc), không chỉ hiện icon trống.
- Phân trang/`Pagination` component: style lại theo token màu mới, giữ nguyên logic phân trang.

## Yêu cầu xuất ra
(a) Danh sách file sửa. (b) Nội dung đầy đủ từng file. (c) Hướng dẫn test: vào `/customer`, `/customer/properties`, thử lọc, thử responsive ở màn hình điện thoại.

Chờ tôi xác nhận test xong rồi mới gửi Bước 3.
