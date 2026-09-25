import { NextResponse } from 'next/server';
import { supabaseAdmin } from './admin';
import { createSupabaseServerClient } from './server';
import type { Database } from './types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Profile['role'];

import { verifyJWT } from '@/lib/auth-utils';

export type ApiAuthContext = {
  userId: string;
  profile: Profile;
};

function extractTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieHeader = request.headers.get('cookie') || '';
  if (!cookieHeader) return null;

  const pairs = cookieHeader.split(';');

  // 1. Tìm custom JWT cookie: auth_token
  for (const pair of pairs) {
    const [k, v] = pair.split('=');
    if (k.trim() === 'auth_token') {
      return decodeURIComponent(v.trim());
    }
  }

  // 2. Tìm Supabase Auth chunked cookies: sb-*-auth-token hoặc sb-*-auth-token.0, .1
  const sbChunks: Map<number, string> = new Map();
  let singleSbToken: string | null = null;

  for (const pair of pairs) {
    const [k, v] = pair.split('=');
    const key = k.trim();
    const val = decodeURIComponent(v.trim());

    if (key.match(/^sb-.*-auth-token$/)) {
      singleSbToken = val;
    } else {
      const match = key.match(/^sb-.*-auth-token\.(\d+)$/);
      if (match) {
        sbChunks.set(parseInt(match[1], 10), val);
      }
    }
  }

  let fullStr = singleSbToken;
  if (!fullStr && sbChunks.size > 0) {
    const sortedKeys = Array.from(sbChunks.keys()).sort((a, b) => a - b);
    fullStr = sortedKeys.map(k => sbChunks.get(k)).join('');
  }

  if (fullStr) {
    if (fullStr.startsWith('base64-')) {
      fullStr = fullStr.slice(7);
      try {
        fullStr = Buffer.from(fullStr, 'base64').toString('utf-8');
      } catch (e) {
        // ignore
      }
    }
    try {
      const parsed = JSON.parse(fullStr);
      if (parsed.access_token) return parsed.access_token;
    } catch (e) {
      if (fullStr.startsWith('eyJ')) return fullStr;
    }
  }

  return null;
}

export async function requireApiAuth(
  request: Request,
  allowedRoles: UserRole[]
): Promise<ApiAuthContext | NextResponse> {
  let userId: string | null = null;
  const token = extractTokenFromRequest(request);

  if (token) {
    // Thử giải mã custom JWT
    const payload = await verifyJWT(token);
    if (payload) {
      userId = (payload.sub || payload.id) as string;
    } else {
      // Nếu custom JWT verify thất bại, thử kiểm tra token với Supabase Auth Server
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) {
          userId = user.id;
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  // Fallback: Thử lấy phiên từ Supabase Server Client
  if (!userId) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    } catch (e) {
      // Ignore
    }
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, role, company_id, is_active, phone, avatar_url, landlord_id, created_at, updated_at, companies(status)')
    .eq('id', userId)
    .maybeSingle();

  // Tự động khởi tạo profile nếu tài khoản tồn tại trong auth.users nhưng chưa có bản ghi profile
  if (!profile && userId) {
    try {
      const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authUserData?.user) {
        const authUser = authUserData.user;
        const { data: newProfile } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: authUser.id,
            email: authUser.email || '',
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Chủ doanh nghiệp',
            avatar_url: authUser.user_metadata?.avatar_url || null,
            phone: authUser.phone || authUser.user_metadata?.phone || '',
            role: 'customer',
          } as any)
          .select('id, email, full_name, role, company_id, is_active, phone, avatar_url, landlord_id, created_at, updated_at, companies(status)')
          .single();

        if (newProfile) {
          profile = newProfile as any;
        }
      }
    } catch (err) {
      console.error('Lỗi tự động khởi tạo profile:', err);
    }
  }

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
