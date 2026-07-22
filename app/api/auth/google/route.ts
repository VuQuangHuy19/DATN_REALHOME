import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') || '/customer';
  
  try {
    const supabase = await createSupabaseServerClient();
    
    // Redirect URIs need to be configured in Supabase dashboard
    // We pass the 'next' parameter so the callback knows where to redirect after login
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${url.origin}/api/auth/google/callback?next=${encodeURIComponent(next)}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      },
    });
    
    if (error) {
      console.error('Google OAuth init error:', error);
      return NextResponse.redirect(`${url.origin}/login?error=${encodeURIComponent(error.message)}`);
    }
    
    if (data?.url) {
      return NextResponse.redirect(data.url);
    }
    
    return NextResponse.redirect(`${url.origin}/login?error=Could+not+initiate+Google+OAuth`);
  } catch (err: any) {
    console.error('Google OAuth server error:', err);
    return NextResponse.redirect(`${url.origin}/login?error=Server+Error`);
  }
}
