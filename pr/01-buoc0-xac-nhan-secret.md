# BƯỚC 0 — Xác nhận secret (chưa sinh code)

Đây là bước đầu tiên trong chuỗi công việc đã nêu ở bối cảnh trước. Bước này CHỈ hỏi tôi, KHÔNG sinh code, KHÔNG sinh migration.

Hỏi tôi xác nhận: giá trị `JWT_SECRET` trong `.env.local` hiện tại của tôi có PHẢI đúng bằng **JWT Secret (mục "Legacy JWT Secret", KHÔNG phải "JWT Signing Keys" mới)** lấy từ Supabase Dashboard → Settings → API hay không.

- Nếu tôi trả lời KHÔNG trùng → hướng dẫn tôi cách cập nhật `.env.local` cho đúng (chỉ đổi giá trị biến, không đổi bất kỳ dòng code nào).
- Nếu tôi trả lời project Supabase của tôi KHÔNG hiển thị "Legacy JWT Secret" mà chỉ có "JWT Signing Keys" (ES256/RS256) → DỪNG LẠI, không đề xuất cách giải quyết, chỉ nói rõ đây là tình huống khác (cần đổi cách tiếp cận, không thuộc phạm vi các bước tiếp theo) và chờ tôi quyết định hướng đi tiếp.

Chỉ hỏi, không làm gì thêm. Sau khi tôi trả lời, dừng lại chờ tôi gửi Bước 1.
