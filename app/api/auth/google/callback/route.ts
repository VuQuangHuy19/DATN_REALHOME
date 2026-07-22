import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { signJWT } from '@/lib/auth-utils';
import { fetchUserSessionData } from '@/lib/auth-session';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/customer';

  if (!code) {
    return NextResponse.redirect(`${url.origin}/login?error=No+code+provided+from+Google`);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !session) {
      console.error('Exchange code error:', error);
      return NextResponse.redirect(`${url.origin}/login?error=${encodeURIComponent(error?.message || 'Failed to exchange code')}`);
    }

    const googleUser = session.user;

    if (!googleUser.email) {
      return NextResponse.redirect(`${url.origin}/login?error=Google+account+must+have+an+email`);
    }

    // 1. Kiểm tra xem profile đã tồn tại chưa bằng email
    let { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', googleUser.email)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      return NextResponse.redirect(`${url.origin}/login?error=System+error`);
    }

    if (!profile) {
      // 2. Chưa có profile -> Tạo mới
      // Đảm bảo tạo với ID trùng khớp với user ID của Google (auth.users)
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: googleUser.id,
          email: googleUser.email,
          full_name: googleUser.user_metadata?.full_name || googleUser.email.split('@')[0],
          avatar_url: googleUser.user_metadata?.avatar_url || null,
          role: 'customer',
          // company_id is null for customers, it's inferred from the tenant domain when they do actions
        })
        .select()
        .single();

      if (insertError) {
        // Fallback: có thể database trigger đã tự tạo profile khi auth.users được insert
        const { data: triggerProfile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('email', googleUser.email)
          .maybeSingle();

        if (triggerProfile) {
          profile = triggerProfile;
        } else {
          console.error('Error creating profile:', insertError);
          return NextResponse.redirect(`${url.origin}/login?error=Could+not+create+user+profile:+${encodeURIComponent(insertError?.message || 'unknown')}`);
        }
      } else {
        profile = newProfile;
      }
    }

    if (!profile) {
      return NextResponse.redirect(`${url.origin}/login?error=Could+not+resolve+user+profile`);
    }

    // 3. Tạo Custom JWT
    const tokenPayload = {
      sub: profile.id, // ID thực sự của profile
      role: 'authenticated', // Role Supabase RLS
      app_metadata: { provider: 'google', providers: ['google'] },
      user_metadata: {
        id: profile.id,
        role: profile.role,
        company_id: profile.company_id,
      },
      id: profile.id,
      email: profile.email,
      user_role: profile.role,
      company_id: profile.company_id, // Cho customer thường là null
    };

    // Customer login from Google có JWT sống 7 ngày
    const jwtDuration = 7 * 24 * 60; // 7 days in minutes
    const token = await signJWT(tokenPayload, `${jwtDuration}m`);

    // 4. Redirect về trang Onboarding Phone nếu chưa có SĐT, ngược lại về next
    const redirectPath = !profile.phone ? '/customer/onboarding/phone' : next;
    const response = NextResponse.redirect(`${url.origin}${redirectPath}`);

    // Set HTTP-only Cookie for security
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * jwtDuration,
    });

    return response;
  } catch (err: any) {
    console.error('Google OAuth callback server error:', err);
    return NextResponse.redirect(`${url.origin}/login?error=Server+Error`);
  }
}
