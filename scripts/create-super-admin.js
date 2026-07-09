// Load các biến môi trường từ .env.local thông qua trình tải mặc định của Next.js
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Lỗi: Vui lòng cung cấp email và password làm đối số truyền vào.');
  console.error('Cú pháp: node scripts/create-super-admin.js <email> <password>');
  process.exit(1);
}
const AUTH_SALT = process.env.AUTH_SALT;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Lỗi: Thiếu cấu hình NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local');
  process.exit(1);
}

if (!AUTH_SALT) {
  console.warn('CẢNH BÁO: AUTH_SALT chưa được định nghĩa trong môi trường!');
}

// 1. Băm mật khẩu sử dụng SHA-256 kết hợp với muối AUTH_SALT
const hash = crypto
  .createHash('sha256')
  .update(password + (AUTH_SALT || ''))
  .digest('hex');

// 2. Khởi tạo Supabase client bằng Service Role Key để thực hiện ghi trực tiếp vào bảng (bỏ qua RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const id = crypto.randomUUID(); // Sinh mã UUID v4 ngẫu nhiên cho bản ghi mới
  console.log(`Đang khởi tạo tài khoản super_admin trong bảng profiles...`);
  console.log(`Email: ${email}`);

  // 3. Thực hiện chèn/cập nhật dữ liệu trực tiếp vào bảng public.profiles
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: id,
      email: email,
      full_name: 'Super Admin',
      password_hash: hash,
      role: 'super_admin',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' })
    .select();

  if (error) {
    console.error('Ghi dữ liệu thất bại:', error.message);
  } else {
    console.log('Tạo tài khoản super_admin thành công!');
    console.log('Chi tiết tài khoản:', data[0]);
  }
}

run();
