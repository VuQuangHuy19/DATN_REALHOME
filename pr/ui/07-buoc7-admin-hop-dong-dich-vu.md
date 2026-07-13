# BƯỚC 7 — Admin: Hợp đồng + Dịch vụ (Hoá đơn / Chỉ số điện nước)

## Phạm vi sửa
- `app/admin/contracts/page.tsx`, `app/admin/contracts/create/page.tsx`, `app/admin/contracts/create-rental/page.tsx`, `app/admin/contracts/[id]/edit/page.tsx`
- `app/admin/contracts/[id]/print/page.tsx` — **CẨN THẬN**: đây là trang IN hợp đồng, khả năng dùng để xuất PDF/in trực tiếp. CHỈ chỉnh style nếu không phá vỡ bố cục in ấn (kiểm tra kỹ `@media print` nếu có, giữ nguyên toàn bộ nội dung pháp lý và định dạng ngày/số tiền).
- `app/admin/services/invoices/page.tsx`
- `app/admin/services/readings/page.tsx`

## Yêu cầu cụ thể
- Danh sách hợp đồng/hoá đơn: bảng theo token Bước 1, cột số tiền căn phải + font JetBrains Mono, cột trạng thái dùng badge semantic.
- Form tạo hợp đồng (nhiều field bên A/bên B, giá, dịch vụ...): chia nhóm rõ ràng bằng section có tiêu đề nhỏ (Thông tin bên cho thuê / bên thuê / điều khoản tài chính...), input dài như địa chỉ full-width, input ngắn như ngày/số tiền chia lưới 2–3 cột — giữ nguyên toàn bộ field/tên field/validate.
- Trang in hợp đồng: KHÔNG đổi bố cục nội dung hợp đồng (đây là văn bản có tính pháp lý, khách chủ nhà sẽ ký), chỉ có thể tinh chỉnh rất nhẹ khoảng cách dòng/margin nếu được yêu cầu rõ, mặc định BỎ QUA bước này trừ khi tôi xác nhận riêng.
- Chỉ số điện nước (readings): dạng bảng nhập liệu, số liệu căn phải font mono, chênh lệch (nếu có tính old/new) hiển thị nổi bật nhẹ.

## Yêu cầu xuất ra
(a) Danh sách file sửa (loại trừ trang print trừ khi tôi xác nhận). (b) Nội dung đầy đủ từng file. (c) Hướng dẫn test: tạo thử 1 hợp đồng, xem danh sách hoá đơn, nhập thử 1 chỉ số điện nước.

Chờ tôi xác nhận test xong rồi mới gửi Bước 8.
