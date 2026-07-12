# [GỬI FILE NÀY ĐẦU TIÊN — 1 LẦN DUY NHẤT, TRƯỚC KHI GỬI BẤT KỲ BƯỚC NÀO]

Đây là bối cảnh nền cho một chuỗi công việc gồm 6 bước tôi sẽ gửi cho bạn lần lượt, MỖI LẦN 1 BƯỚC, trong CÙNG cuộc hội thoại này. Đọc kỹ, ghi nhớ, và CHỈ trả lời xác nhận đã hiểu — CHƯA làm gì cả, chưa sinh code. Tôi sẽ gửi bước đầu tiên ở tin nhắn kế tiếp.

## Dự án
SaaS B2B quản lý Căn hộ dịch vụ (CHDV)/phòng trọ cho thuê.
- Next.js 13.5.1 (App Router), TypeScript, `@supabase/supabase-js` 2.108.2, `@supabase/ssr` 0.12.0, `jose` 6.2.3.
- Database: Supabase Postgres. Multi-tenant qua cột `company_id` trên hầu hết bảng nghiệp vụ.
- Vai trò (`profiles.role`): `super_admin`, `company_admin`, `manager`, `sales_agent`, `landlord`.

## Auth hiện tại (KHÔNG được sửa trong bất kỳ bước nào trừ khi tôi nói rõ)
Hệ thống tự implement JWT riêng bằng `jose`, KHÔNG dùng Supabase Auth. Token lưu ở cookie `auth_token` (httpOnly), ký/verify trong `lib/auth-utils.ts`.

Payload JWT khi login (`app/api/auth/login/route.ts`) đã có sẵn:
```ts
const tokenPayload = {
  sub: profile.id,        // For Supabase RLS auth.uid()
  role: 'authenticated',  // For Supabase RLS auth.role()
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { id: profile.id, role: profile.role, company_id: profile.company_id },
  id: profile.id,
  email: profile.email,
  user_role: profile.role,
  company_id: profile.company_id,
};
```
→ Token này ĐƯỢC THIẾT KẾ SẴN để dùng chung cho cả app tự check quyền LẪN Supabase RLS, miễn là `JWT_SECRET` (env, dùng ký/verify token) TRÙNG với JWT Secret (legacy HS256) của project Supabase (Dashboard → Settings → API). Không cần ký thêm token thứ 2, không cần thêm secret mới.

`lib/auth-utils.ts` dùng `jose`, có `signJWT`, `verifyJWT` (HS256, secret từ `process.env.JWT_SECRET`) — giữ nguyên, không sửa.

`lib/supabase/api-auth.ts` có sẵn `requireApiAuth(request, allowedRoles)` — verify JWT tự chế + load profile bằng service role — dùng cho API route, KHÔNG liên quan tới RLS, không đụng vào.

`lib/supabase/client.ts` hiện tại (browser client, CHƯA có `accessToken`):
```ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const _browserClient =
  typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey
    ? createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
    : null;

export const supabase = new Proxy({} as any, {
  get(_target, prop) {
    const client = _browserClient;
    if (!client) {
      if (prop === 'auth') {
        return new Proxy({}, {
          get(_authTarget, authProp) {
            return async () => ({ data: { user: null }, error: new Error('Supabase is not configured') });
          },
        });
      }
      return async () => ({ data: null, error: new Error('Supabase is not configured') });
    }
    return (client as any)[prop];
  },
});
```

## Vấn đề cần vá
RLS đã bị TẮT HOÀN TOÀN trên gần hết bảng nghiệp vụ qua các migration đã tồn tại:
- `supabase/migrations/20260706200000_disable_rls_for_custom_auth.sql`
- `supabase/migrations/20260706250000_disable_rls_remaining_tables.sql`
- `supabase/migrations/20260709160000_disable_rls_for_categories.sql`

Toàn bộ `lib/supabase/repositories/*.ts` (rooms, invoices, leads, employees, companies, profiles, deposit_contracts, rental_contracts...) query trực tiếp qua browser client dùng anon key, hiện KHÔNG có claim gì đính kèm → vì RLS tắt hết, bất kỳ ai có anon key + Supabase URL (đều public, lộ trong bundle JS) gọi thẳng REST API là đọc/ghi được TOÀN BỘ dữ liệu mọi công ty, gồm `profiles.password_hash`, CCCD/ngày sinh trong hợp đồng, số tài khoản ngân hàng.

Có dùng Realtime (`supabase.channel()`/`postgres_changes`) ở ~5 nơi — phải test lại sau khi bật RLS.

## Refactor kiến trúc đang dang dở
`docs/architecture-refactor-plan.md` mô tả chuyển từ `lib/supabase/repositories/*` sang `src/features/<module>/{types,services,hooks,components}`. Mới xong 4 module: `rooms`, `properties`, `finance`, `staff`. Khi bật RLS cho 1 bảng, TIỆN TAY chuyển luôn repository tương ứng sang cấu trúc mới — làm 1 lần cho cả 2 việc.

## RBAC có sẵn trong DB (dùng lại, không tạo bảng mới)
`permissions` (module + action), `roles.permissions` (mảng text), `role_permissions` (map role ↔ permission).

## Schema các bảng liên quan
- `profiles`: id, company_id, full_name, phone, role, avatar_url, is_active, email, password_hash, landlord_id.
- `companies`: id, name, domain, plan, status, owner_name, owner_email, phone, address, total_users, total_properties, trial_ends_at, code, logo_url, jwt_duration.
- `leads`: id, company_id, full_name, phone, email, source, status, assigned_to, created_by, updated_by.
- `appointments`: id, company_id, customer_name, room_id, assigned_to, assigned_to_name, landlord_id, building_id.
- `deposit_contracts` / `rental_contracts`: id, company_id, room_id, party_a_*/party_b_* (id_card, dob, address, phone), rent_price, deposit_amount, bank_account_number, bank_account_owner, created_by, updated_by.
- `rooms`, `buildings`: có `company_id` và `landlord_id` (kiểu `text`, KHÔNG phải FK uuid — chú ý ép kiểu khi so sánh trong policy).

## Ràng buộc áp dụng cho MỌI bước từ giờ về sau
1. KHÔNG đưa `SUPABASE_SERVICE_ROLE_KEY` hay secret nào vào code client/browser.
2. KHÔNG sửa `signJWT`, `verifyJWT`, cookie `auth_token`, hay `app/api/auth/login/route.ts`.
3. Mỗi migration SQL là 1 file riêng `supabase/migrations/YYYYMMDDHHMMSS_mo_ta_ngan.sql`.
4. Trước khi bật RLS 1 bảng, PHẢI viết đủ policy SELECT/INSERT/UPDATE/DELETE cần thiết — không để thiếu policy.
5. Quy tắc phân quyền dùng cho mọi policy:
   - `super_admin`: toàn quyền mọi công ty.
   - `company_admin`, `manager`: toàn quyền trong đúng `company_id` của mình.
   - `sales_agent`: trong company của mình; với `leads`/`appointments` chỉ thao tác bản ghi có `assigned_to = auth.uid()` hoặc `created_by = auth.uid()`; với `rooms`/`buildings` chỉ SELECT.
   - `landlord`: chỉ SELECT dữ liệu theo `landlord_id` của chính mình.
6. Bảng chứa PII nhạy cảm (`profiles`, `deposit_contracts`, `rental_contracts`, `companies`, `tenant_invitations`): sau khi bật RLS, thêm `REVOKE ALL ON <table> FROM anon;`.
7. KHÔNG tự chạy migration lên database thật — chỉ sinh file `.sql`, tôi tự apply thủ công.
8. Khi refactor 1 repository, giữ nguyên tên hàm export + signature; nếu bắt buộc đổi, liệt kê đầy đủ nơi gọi cần sửa theo.
9. Mỗi bước xuất ra: (a) danh sách file tạo/sửa, (b) nội dung đầy đủ từng file, (c) hướng dẫn test thủ công để xác nhận đúng trước khi sang bước kế tiếp.
10. CHỈ làm đúng phạm vi của bước tôi gửi — không tự ý làm trước các bước sau.

Xác nhận bạn đã đọc và hiểu toàn bộ — CHƯA làm gì, chờ tôi gửi Bước 0 ở tin tiếp theo.
