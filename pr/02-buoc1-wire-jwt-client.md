# BƯỚC 1 — Wire JWT vào Supabase browser client

Secret đã được xác nhận/đồng bộ đúng ở Bước 0. Giờ làm bước này.

## Việc cần làm
- Sửa `lib/supabase/client.ts`: thêm option `accessToken: async () => <đọc cookie auth_token>` khi gọi `createBrowserClient`. Vì cookie `auth_token` là **httpOnly** (đã set vậy có chủ đích ở `login/route.ts`, KHÔNG được đổi thành non-httpOnly), hãy đề xuất cách lấy token phù hợp cho `accessToken` mà KHÔNG cần bỏ httpOnly — ví dụ qua 1 API route nội bộ nhỏ trả về token hiện tại từ session, hoặc cách khác an toàn tương đương. Giải thích rõ đánh đổi của phương án bạn chọn trước khi đưa code.
- Không đổi gì khác trong file `lib/supabase/client.ts` ngoài phần này.
- Không đụng vào `lib/supabase/server.ts`, `lib/supabase/admin.ts`, hay bất kỳ file nào khác ở bước này.

## Test thủ công cần hướng dẫn tôi làm (bắt buộc trước khi báo xong bước)
- Cách kiểm tra qua tab Network của trình duyệt: sau khi login, xem 1 request gọi tới Supabase REST API có đính kèm đúng JWT vào header `Authorization: Bearer ...` không.
- Cách chạy `select auth.jwt();` trong Supabase SQL editor (hoặc cách tương đương) để xác nhận claim `sub`, `role`, `company_id`, `user_role` đều xuất hiện đúng — làm việc này TRƯỚC khi bật RLS ở bước sau, vì lúc này CHƯA bảng nào bật RLS nên an toàn để test.

## Output yêu cầu
1. Danh sách file sẽ sửa (chỉ nên là 1 file, nêu rõ nếu cần thêm file phụ trợ và giải thích tại sao).
2. Nội dung đầy đủ file sau khi sửa.
3. Hướng dẫn test theo đúng 2 gạch đầu dòng ở trên.

Dừng lại sau khi xong, chờ tôi xác nhận đã test thành công rồi mới gửi Bước 2.
