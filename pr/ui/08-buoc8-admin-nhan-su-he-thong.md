# BƯỚC 8 — Admin: Nhân sự (HR) + Hệ thống (System)

## Phạm vi sửa
- `app/admin/hr/employees/page.tsx`, `app/admin/hr/kpi/page.tsx`
- `app/admin/system/accounts/page.tsx`, `app/admin/system/roles/page.tsx`, `app/admin/system/employees/page.tsx`, `app/admin/system/notifications/page.tsx`, `app/admin/system/activity-logs/page.tsx`, `app/admin/system/import/page.tsx`
- `app/admin/change-password/page.tsx`

## Yêu cầu cụ thể
- Nhân viên (employees) + tài khoản (accounts): bảng đồng bộ token, avatar tròn nhỏ + tên + vai trò dạng badge.
- KPI: nếu có bảng điểm/số liệu theo nhân viên, số liệu quan trọng (tỷ lệ chuyển đổi, doanh thu) căn phải, font mono, có thanh tiến trình ngang mảnh (không phải thanh tiến trình dày màu sắc sặc sỡ) để so target/actual nếu dữ liệu đã có `target_revenue`/`revenue_generated`.
- Phân quyền (roles): danh sách quyền dạng checkbox nhóm theo module — giữ nguyên logic gán quyền, chỉ gom nhóm hiển thị bằng accordion/section nếu danh sách quyền dài.
- Nhật ký hoạt động (activity-logs): dạng timeline dọc đơn giản (chấm nhỏ + đường nối mảnh), mỗi dòng: ai, làm gì, khi nào — không dùng bảng dày đặc nếu nội dung là log tường thuật.
- Nhập liệu hàng loạt (import): giữ nguyên cơ chế upload/preview hiện có, chỉ chỉnh style vùng kéo-thả file và bảng preview.
- Đổi mật khẩu: form đơn giản 1 cột, giữ nguyên validate.

## Yêu cầu xuất ra
(a) Danh sách file sửa. (b) Nội dung đầy đủ từng file. (c) Hướng dẫn test: vào từng trang, thử 1 thao tác chính mỗi trang (thêm tài khoản, xem KPI 1 nhân viên, xem log gần nhất...).

Chờ tôi xác nhận test xong rồi mới gửi Bước 9.
