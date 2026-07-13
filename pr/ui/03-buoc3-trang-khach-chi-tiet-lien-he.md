# BƯỚC 3 — Trang khách hàng: Chi tiết phòng + Yêu thích + Liên hệ + Đặt lịch tư vấn

## Phạm vi sửa
- `app/customer/properties/[id]/page.tsx` (chi tiết phòng)
- `app/customer/favorites/page.tsx`
- `app/customer/contact/page.tsx`
- `app/customer/request-consultation/page.tsx`

## Yêu cầu cụ thể
### Chi tiết phòng
- Gallery ảnh lớn ở trên/bên trái (giữ nguyên logic carousel/lightbox hiện có nếu có), thông tin (giá, địa chỉ, tiện ích, mô tả) bố cục 2 cột trên desktop, 1 cột mobile.
- Danh sách tiện ích (amenities) hiển thị dạng icon + label ngắn, lưới đều, không liệt kê dạng list chấm tròn.
- Khối "Đặt lịch xem phòng"/"Liên hệ tư vấn" cố định bên phải khi cuộn (sticky) trên desktop — giữ nguyên form fields và logic submit hiện có, chỉ đổi UI.
- Thông tin giá/điện/nước/dịch vụ nếu hiển thị dạng bảng — dùng font JetBrains Mono cho số liệu, layout dạng key-value rõ ràng.

### Yêu thích (favorites)
- Nếu danh sách rỗng: trạng thái rỗng theo giọng điệu ở file 00 (không chỉ "chưa có gì"), có CTA quay lại danh sách phòng.
- Card hiển thị giống style card ở Bước 2 để đồng bộ.

### Liên hệ & Đặt lịch tư vấn
- Form 1 cột, label rõ ràng phía trên input, validate lỗi hiển thị ngay dưới field bằng màu `--danger` (giữ nguyên logic validate hiện có).
- Trạng thái gửi thành công: thông báo rõ ràng, giọng điệu tích cực, không dùng alert() mặc định trình duyệt nếu code hiện đang dùng `toast`/`sonner` thì giữ nguyên cơ chế đó, chỉ chỉnh nội dung/style hiển thị.

## Yêu cầu xuất ra
(a) Danh sách file sửa. (b) Nội dung đầy đủ từng file. (c) Hướng dẫn test: xem chi tiết 1 phòng, thêm/xoá yêu thích, gửi form liên hệ và đặt lịch tư vấn thử.

Chờ tôi xác nhận test xong rồi mới gửi Bước 4.
