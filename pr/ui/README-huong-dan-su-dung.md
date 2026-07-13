# Hướng dẫn dùng bộ prompt redesign giao diện REALHOME

Bộ này gồm 11 file, dùng đúng cách bạn đã làm với đợt hardening RLS trước:

| Thứ tự | File | Nội dung |
|---|---|---|
| 0 | `00-boi-canh-va-design-system.md` | Bối cảnh + design system (màu, font, token) — **gửi 1 lần đầu tiên, luôn gửi lại nếu mở chat mới** |
| 1 | `01-buoc1-design-system-component-chung.md` | Áp token vào component dùng chung + layout khung sườn |
| 2 | `02-buoc2-trang-khach-trang-chu-danh-sach.md` | Trang chủ + danh sách phòng (khách) |
| 3 | `03-buoc3-trang-khach-chi-tiet-lien-he.md` | Chi tiết phòng, yêu thích, liên hệ, đặt lịch tư vấn |
| 4 | `04-buoc4-dang-nhap-onboarding.md` | Đăng nhập + Onboarding |
| 5 | `05-buoc5-admin-tong-quan-khach-hang.md` | Admin: Tổng quan + Lead/Lịch hẹn/Tư vấn |
| 6 | `06-buoc6-admin-bat-dong-san.md` | Admin: Toà nhà/Phòng/Chủ nhà |
| 7 | `07-buoc7-admin-hop-dong-dich-vu.md` | Admin: Hợp đồng + Hoá đơn/Chỉ số |
| 8 | `08-buoc8-admin-nhan-su-he-thong.md` | Admin: Nhân sự + Hệ thống |
| 9 | `09-buoc9-landlord-portal.md` | Cổng chủ nhà |
| 10 | `10-buoc10-super-admin.md` | Super-admin |

## Cách dùng
1. Mở 1 cuộc chat mới với Gemini (hoặc AI code khác).
2. Gửi `00-boi-canh-va-design-system.md` trước — chờ nó xác nhận đã hiểu, KHÔNG để nó sinh code ngay.
3. Gửi lần lượt `01` → `10`, mỗi lần 1 file. Sau mỗi bước: tự test kỹ theo mục "Yêu cầu xuất ra" trong file, rồi mới gửi bước kế tiếp.
4. Nếu giữa chừng phải mở chat mới (mất context) → gửi lại `00` + nói rõ đã làm xong tới bước mấy.
5. Bước 1 là NỀN TẢNG — nếu bước 1 làm chưa chuẩn (màu/font/sidebar sai), mọi bước sau sẽ lệch theo. Nên test bước 1 kỹ nhất trước khi đi tiếp.

## Lưu ý quan trọng
- Toàn bộ prompt đều ép AI **chỉ sửa UI**, không đụng logic/hooks/API/field dữ liệu — để không phá hệ thống RLS/JWT vừa xử lý trước đó.
- Bước 7 (hợp đồng) có phần trang IN hợp đồng — cố ý tách riêng, cẩn thận vì liên quan văn bản có giá trị pháp lý.
- Nếu ở bước nào AI đề xuất đổi tên field/hàm để "cho gọn" — TỪ CHỐI, yêu cầu nó giữ nguyên, chỉ đổi hiển thị.
