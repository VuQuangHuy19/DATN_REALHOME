import { NextResponse } from 'next/server';
import { supabaseAdmin } from './admin';
import type { Database } from './types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Profile['role'];

import { verifyJWT } from '@/lib/auth-utils';

export type ApiAuthContext = {
  userId: string;
  profile: Profile;
};

export async function requireApiAuth(
  request: Request,
  allowedRoles: UserRole[]
): Promise<ApiAuthContext | NextResponse> {
  let token = '';
  const authHeader = request.headers.get('Authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else {
    // Hỗ trợ lấy token từ Cookie auth_token cho các request từ cùng origin
    const cookieHeader = request.headers.get('cookie') || '';
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const [k, v] = pair.split('=');
      if (k.trim() === 'auth_token') {
        token = decodeURIComponent(v.trim());
        break;
      }
    }
  }

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await verifyJWT(token);

  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (payload.sub || payload.id) as string;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, role, company_id, is_active, phone, avatar_url, landlord_id, created_at, updated_at, companies(status)')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!profile.is_active) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Chặn thao tác ghi (POST, PUT, DELETE, PATCH) nếu công ty bị tạm khóa (suspended)
  const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);
  const isCheckout = new URL(request.url).pathname.endsWith('/api/subscriptions/checkout');
  if (isWrite && !isCheckout && profile.role !== 'super_admin' && profile.company_id) {
    const compStatus = (profile as any).companies?.status;
    if (compStatus === 'suspended') {
      return NextResponse.json(
        { error: 'Công ty của bạn đang tạm khóa do hết hạn gói dịch vụ. Vui lòng thanh toán/gia hạn để tiếp tục thao tác.' },
        { status: 403 }
      );
    }
  }

  return { userId, profile: profile as Profile };
}

export function isApiError(result: ApiAuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
