# [GỬI FILE NÀY ĐẦU TIÊN — 1 LẦN DUY NHẤT, TRƯỚC KHI GỬI BẤT KỲ BƯỚC NÀO]

Đây là bối cảnh nền cho một chuỗi công việc **thiết kế lại giao diện (UI/UX only)** gồm nhiều bước, mỗi bước tôi sẽ gửi 1 file riêng, TRONG CÙNG một cuộc hội thoại. Đọc kỹ, ghi nhớ, và CHỈ trả lời xác nhận đã hiểu — CHƯA sửa code gì cả. Tôi sẽ gửi bước đầu tiên ở tin nhắn kế tiếp.

## Dự án
SaaS B2B quản lý Căn hộ dịch vụ (CHDV)/phòng trọ cho thuê — tên thương hiệu "REALHOME".
- Next.js 13.5.1 (App Router), TypeScript, Tailwind CSS, `shadcn/ui` (đã cài sẵn ~40 component trong `components/ui/*`, khai báo ở `components.json`).
- 4 khu vực giao diện tách biệt: `app/customer/*` (trang khách xem phòng/đặt lịch, public), `app/login` + `app/onboarding`, `app/admin/*` (dashboard công ty: sales/quản lý), `app/landlord/*` (chủ nhà), `app/super-admin/*` (Anthropic-style admin của chính REALHOME quản lý toàn bộ các công ty khách hàng).

## PHẠM VI: CHỈ ĐƯỢC SỬA GIAO DIỆN
Đây là điểm quan trọng nhất, áp dụng cho MỌI bước sau:
1. CHỈ được sửa: JSX/markup, className Tailwind, cấu trúc layout, component hiển thị (`components/ui/*`), animation/transition CSS, responsive breakpoints.
2. TUYỆT ĐỐI KHÔNG được sửa: tên hàm, props, hooks (`useAppointments`, `useAuth`, `useProfiles`...), logic gọi API/Supabase, tên field dữ liệu, business logic (tính toán, validate, điều kiện phân quyền), route/path, tên file.
3. Nếu 1 file vừa có logic vừa có UI, CHỈ đụng vào phần `return (...)` JSX và các style liên quan — giữ nguyên 100% phần logic phía trên.
4. Không thêm thư viện mới ngoài những gì đã có sẵn (`lucide-react`, `shadcn/ui`, `tailwindcss`, `recharts` nếu cần biểu đồ — kiểm tra `package.json` trước khi dùng thư viện chart).
5. Giữ nguyên toàn bộ text tiếng Việt hiện có trừ khi tôi yêu cầu viết lại copy ở bước cụ thể.
6. Mỗi bước PHẢI responsive (mobile → desktop), có trạng thái loading/empty/error rõ ràng, giữ khả năng điều hướng bằng bàn phím cho các phần tử tương tác.

## Design System — ÁP DỤNG THỐNG NHẤT CHO TẤT CẢ CÁC BƯỚC

Phong cách: **tối giản, sạch sẽ, nhiều khoảng trắng, ít màu** — hiện đại, gọn gàng, không phô trương, nhưng vẫn có một điểm nhấn nhận diện thương hiệu. Tránh mọi thứ nhìn "AI mặc định": không nền be/cream + serif + cam đất; không nền đen + gradient tím; không bo tròn đều tất cả mọi thứ.

### Màu sắc — dải "Deep Harbor Blue" (dùng đúng các mã này, không tự sáng tạo thêm màu khác)
- `--bg-base`: `#FAFBFC` — nền chính, trắng ngả xanh rất nhẹ, không trắng tinh.
- `--bg-subtle`: `#EEF2F7` — nền phụ (sidebar, card nổi nhẹ trên nền chính) — xanh xám rất nhạt, cùng họ với accent chứ không phải xám trung tính vô cảm.
- `--ink`: `#0E1B2A` — màu chữ chính, xanh than gần đen (không dùng đen tuyệt đối `#000`).
- `--ink-muted`: `#5B6B7D` — chữ phụ/caption, xám ánh xanh.
- `--border`: `#DCE3EA` — viền hairline 1px, dùng thay bóng đổ nặng.
- `--accent-900`: `#0B2545` — xanh navy sâu nhất, dùng cho nền tối chủ đích (sidebar super-admin, footer, phần hero nhấn mạnh).
- `--accent`: `#1D4E89` — xanh dương đậm (deep blue), màu THƯƠNG HIỆU chính — dùng cho nút hành động chính (primary button), link đang active, icon/badge quan trọng, số liệu nổi bật, đường kẻ chữ ký thiết kế. KHÔNG dùng làm nền tràn lớn ở nội dung thường.
- `--accent-500`: `#3E7CC2` — xanh dương trung, dùng cho hover/hover-state hoặc icon phụ ít nổi bật hơn `--accent`.
- `--accent-soft`: `#E4EEFA` — nền nhạt của accent, dùng cho badge/tag/trạng thái thành công/hover nhẹ trên nền trắng.
- `--warn`: `#B45309` (cam đất trầm) và `--danger`: `#B3261E` — chỉ dùng cho trạng thái cảnh báo/lỗi/hủy, không dùng trang trí. Đây là 2 màu ấm duy nhất được phép xuất hiện trong toàn bộ hệ thống, để tương phản rõ với dải xanh lạnh còn lại.
- Quy tắc: mỗi màn hình chỉ nên thấy `--accent`/`--accent-900` ở tối đa 1–2 vị trí nổi bật; phần còn lại là trắng/xám-xanh nhạt/xanh than. Đây là "ít màu" — dải xanh là ngoại lệ được phép, không phải phủ khắp nơi. Tránh xanh dương mặc định kiểu SaaS (`#2563EB`/`#4F46E5` Tailwind blue/indigo-600) — `--accent` `#1D4E89` trầm và có chiều sâu hơn, không "công nghiệp".

### Typography
- Heading/Display: **Space Grotesk** (google font) — dùng cho H1–H3, số liệu lớn (KPI, giá phòng). Weight 500–700, letter-spacing hơi âm (-0.01em) ở size lớn.
- Body: **Manrope** — dùng cho toàn bộ text thường, label, button. Weight 400/500/600.
- Dữ liệu dạng mã/số (mã phòng, mã hợp đồng, số điện thoại, giá tiền dạng bảng): **JetBrains Mono**, weight 400–500, để phân biệt rõ với text thường.
- Không dùng Inter ở bất kỳ đâu.

### Layout & component tokens
- Bo góc: `rounded-lg` (8px) cho card/input/dialog, `rounded-full` CHỈ cho badge trạng thái và avatar — không bo tròn đều mọi thứ như mặc định.
- Viền thay bóng đổ: ưu tiên `border border-[--border]` mỏng 1px thay vì `shadow-lg`; chỉ dùng shadow rất nhẹ (`shadow-sm`) cho dropdown/dialog nổi trên nội dung.
- Khoảng trắng: khoảng cách section rộng rãi (`py-16`+ ở landing, `p-6`+ ở dashboard card), không dồn nén.
- Bảng dữ liệu (admin): header bảng dùng `--bg-subtle` + chữ `--ink-muted` uppercase nhỏ + letter-spacing rộng; hàng cách nhau bằng `divide-y` viền mảnh, không zebra-stripe màu.
- Trạng thái (status badge): nền `--accent-soft`/vàng nhạt/đỏ nhạt tương ứng, chữ đậm màu tương ứng, `rounded-full`, size nhỏ — đồng bộ với các badge đã có trong `statusColors` ở các trang hiện tại (giữ đúng mapping trạng thái cũ, chỉ đổi màu theo token mới).

### Chữ ký thiết kế (signature) — dùng nhất quán xuyên suốt
Một đường kẻ mảnh `--accent` dày 2px xuất hiện ở đúng 1 vị trí lặp lại có chủ đích trên mọi trang: cạnh trên cùng của card/section đang active hoặc cạnh trái của mục đang chọn trong sidebar/tab — đóng vai trò "điểm nhận diện" REALHOME, không lạm dụng ở nơi khác.

---
Xác nhận bạn đã đọc và hiểu toàn bộ bối cảnh + design system trên — CHƯA sửa code gì. Chờ tôi gửi Bước 1 ở tin nhắn kế tiếp.
