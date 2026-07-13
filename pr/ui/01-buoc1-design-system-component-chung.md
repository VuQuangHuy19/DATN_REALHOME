# BƯỚC 1 — Áp dụng Design System vào component dùng chung (nền tảng cho mọi trang sau)

Đây là bước ĐẦU TIÊN sinh code thật, làm trước vì mọi bước sau đều phụ thuộc vào các component/layout này. Không làm bất kỳ trang nghiệp vụ cụ thể nào ở bước này.

## Phạm vi sửa
1. `tailwind.config.ts` — thêm 2 font family (`Space Grotesk`, `Manrope`, `JetBrains Mono`) và các màu token ở file 00 vào `theme.extend.colors` (đặt tên biến rõ ràng: `bg-base`, `bg-subtle`, `ink`, `ink-muted`, `border-subtle`, `accent-900`, `accent`, `accent-500`, `accent-soft`, `warn`, `danger`).
2. `app/globals.css` — import Google Fonts (Space Grotesk, Manrope, JetBrains Mono), set biến CSS `:root`, set `font-family` mặc định = Manrope, heading mặc định = Space Grotesk.
3. Các component nền tảng trong `components/ui/` cần chỉnh theme (KHÔNG đổi props/API của component, chỉ đổi style mặc định): `button.tsx`, `card.tsx`, `input.tsx`, `badge.tsx`, `table.tsx` (nếu có), `dialog.tsx`.
4. Sidebar/topbar khung admin (tìm trong `components/admin/` — layout chung của `/admin/*`, ví dụ `AdminSidebar`/`AdminLayout` nếu tồn tại) và tương tự khung của `/landlord/*`, `/super-admin/*` nếu chúng dùng chung 1 component layout.

## Yêu cầu cụ thể
- Button: 3 biến thể rõ ràng — primary (nền `--accent`, chữ trắng, hover đậm hơn 1 nấc), outline (viền `--border`, chữ `--ink`, hover nền `--bg-subtle`), ghost (không viền, dùng cho action icon trong bảng). Không dùng gradient.
- Card: nền trắng, viền `--border` 1px, `rounded-lg`, padding rộng rãi, không shadow nặng.
- Input/select: viền mảnh, focus ring màu `--accent` (không phải xanh dương mặc định của trình duyệt/shadcn default).
- Badge trạng thái: dùng đúng bảng màu semantic ở file 00, giữ nguyên tên các trạng thái hiện có trong code (không đổi string trạng thái, chỉ đổi class hiển thị).
- Sidebar admin: nền `--bg-subtle`, mục đang active có đường kẻ trái 2px `--accent` (đúng "chữ ký thiết kế" ở file 00) + chữ đậm `--ink`, mục không active chữ `--ink-muted`. Logo/tên công ty ở trên cùng, giữ nguyên vị trí hiện tại. (Riêng sidebar `/super-admin` dùng nền tối `--accent-900` thay vì `--bg-subtle` — xem chi tiết ở Bước 10 — để phân biệt cấp quyền cao nhất.)
- Topbar: giữ nguyên các phần tử chức năng hiện có (search, notification bell, avatar user) — chỉ chỉnh spacing, font, màu viền dưới cùng mảnh thay vì shadow.

## Việc cần làm rõ trước khi bắt đầu
Trước khi viết code, hãy tự đọc `components.json`, `tailwind.config.ts` hiện tại, và cấu trúc `components/admin/` để xác định chính xác tên file/tên component layout đang dùng, tránh đoán sai tên file.

## Yêu cầu xuất ra
(a) Danh sách file sửa. (b) Nội dung đầy đủ từng file. (c) Hướng dẫn test thủ công: mở `/admin`, `/landlord`, `/super-admin` — kiểm tra font, màu, sidebar active state hiển thị đúng, không có phần tử nào bị vỡ layout.

Chờ tôi xác nhận test xong rồi mới gửi Bước 2.
