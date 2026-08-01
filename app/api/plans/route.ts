import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireApiAuth, isApiError } from '@/lib/supabase/api-auth';

export const runtime = 'nodejs';

// Mặc định ban đầu nếu CSDL chưa khởi tạo bảng plans
const DEFAULT_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 500000,
    seats: 5,
    extra_seat_price: 50000,
    description: 'Phù hợp cho công ty nhỏ bắt đầu tham gia thị trường',
    iconBg: 'bg-bg-subtle text-ink-muted',
    badgeStyle: 'bg-bg-subtle text-ink border border-border',
    popular: false,
    features: [
      'Tối đa 5 người dùng',
      'Quản lý tối đa 50 phòng',
      'CRM cơ bản (Leads, Lịch hẹn)',
      'Báo cáo tháng',
      'Hỗ trợ email',
    ],
    missing: ['KPI & Leaderboard', 'Multi-company', 'API Access', 'SLA hỗ trợ'],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 2000000,
    seats: 20,
    extra_seat_price: 100000,
    description: 'Cho công ty vừa với nhu cầu CRM nâng cao và phân tích',
    iconBg: 'bg-[hsl(211,80%,92%)] text-[hsl(211,60%,32%)]',
    badgeStyle: 'bg-[hsl(211,80%,92%)] text-[hsl(211,60%,32%)] border border-[hsl(211,55%,76%)]',
    popular: true,
    features: [
      'Tối đa 20 người dùng',
      'Không giới hạn phòng',
      'CRM đầy đủ + Lead Timeline',
      'KPI & Leaderboard nhân viên',
      'Nhật ký hoạt động',
      'Thông báo thời gian thực',
      'Hỗ trợ ưu tiên (chat)',
    ],
    missing: ['Multi-company', 'API Access'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 5000000,
    seats: 999,
    extra_seat_price: 0,
    description: 'Giải pháp toàn diện cho tập đoàn bất động sản lớn',
    iconBg: 'bg-[hsl(38,90%,92%)] text-[hsl(38,72%,30%)]',
    badgeStyle: 'bg-[hsl(38,90%,92%)] text-[hsl(38,72%,30%)] border border-[hsl(38,72%,76%)]',
    popular: false,
    features: [
      'Không giới hạn người dùng',
      'Không giới hạn tất cả',
      'Toàn bộ tính năng Professional',
      'Multi-company management',
      'API Access & Webhooks',
      'SLA 99.9% uptime',
      'Account Manager riêng',
      'Custom branding',
    ],
    missing: [],
  },
];

// In-memory cache fallback nếu DB chưa tạo bảng
let cachedPlans = [...DEFAULT_PLANS];

/**
 * GET /api/plans
 * Trả về danh sách gói dịch vụ SaaS
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('saas_plans')
      .select('*')
      .order('price', { ascending: true });

    if (!error && data && data.length > 0) {
      return NextResponse.json({ success: true, plans: data });
    }
  } catch (e) {
    // Fallback to cached in-memory plans
  }

  return NextResponse.json({ success: true, plans: cachedPlans });
}

/**
 * POST /api/plans
 * Super Admin cập nhật / lưu cấu hình các gói dịch vụ
 */
export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, ['super_admin']);
    if (isApiError(auth)) return auth;

    const body = await request.json();
    const { plans } = body;

    if (!Array.isArray(plans)) {
      return NextResponse.json({ error: 'Dữ liệu danh sách gói dịch vụ không hợp lệ' }, { status: 400 });
    }

    cachedPlans = plans;

    // Cố gắng ghi vào bảng saas_plans nếu bảng đã được khởi tạo trong Database
    try {
      for (const p of plans) {
        await supabaseAdmin.from('saas_plans').upsert({
          id: p.id,
          name: p.name,
          price: p.price,
          seats: p.seats,
          extra_seat_price: p.extra_seat_price || 0,
          description: p.description,
          popular: p.popular,
          features: p.features,
          missing: p.missing,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (dbErr) {
      console.log('Chưa có bảng saas_plans, lưu vào bộ nhớ tạm thành công.');
    }

    return NextResponse.json({ success: true, plans: cachedPlans });
  } catch (error: any) {
    console.error('Lỗi khi lưu cấu hình gói dịch vụ:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
