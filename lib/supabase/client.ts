import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Singleton browser client — chỉ khởi tạo 1 lần duy nhất khi module được load.
 * Việc dùng singleton đảm bảo supabase.channel() và supabase.removeChannel()
 * luôn hoạt động trên cùng một instance, tránh leak subscription realtime.
 */
let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let tokenPromise: Promise<string | null> | null = null;

// Tự động xóa cache token khi người dùng đăng nhập hoặc đăng xuất
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as any).url || '';
    if (url.includes('/api/auth/login') || url.includes('/api/auth/logout')) {
      cachedToken = null;
      tokenExpiresAt = 0;
      tokenPromise = null;
    }
    return response;
  };
}

async function getAccessToken(): Promise<string | null> {
  const now = Date.now();
  // Nếu có cachedToken và token còn hạn hơn 10 giây, tái sử dụng để tránh fetch API liên tục
  if (cachedToken && now < tokenExpiresAt - 10000) {
    return cachedToken;
  }

  if (!tokenPromise) {
    tokenPromise = (async () => {
      try {
        const localToken = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
        const headers: Record<string, string> = {};
        if (localToken) {
          headers['Authorization'] = `Bearer ${localToken}`;
        }
        
        const res = await fetch('/api/auth/session', { headers });
        if (!res.ok) {
          if (localToken) {
            // Fallback to local token if API fails (e.g. offline or cross-origin issues)
            try {
              const payload = JSON.parse(atob(localToken.split('.')[1]));
              if (Date.now() < payload.exp * 1000) {
                cachedToken = localToken;
                tokenExpiresAt = payload.exp * 1000;
                return cachedToken;
              } else {
                localStorage.removeItem('bds_auth_token');
              }
            } catch {
              // ignore
            }
          }
          cachedToken = null;
          tokenExpiresAt = 0;
          return null;
        }
        const data = await res.json();
        if (data.token) {
          cachedToken = data.token;
          if (typeof window !== 'undefined') {
            localStorage.setItem('bds_auth_token', data.token);
          }
          // Giải mã payload JWT (không cần verify vì chỉ lấy exp để cache ở client)
          try {
            const payload = JSON.parse(atob(data.token.split('.')[1]));
            tokenExpiresAt = payload.exp * 1000;
          } catch {
            // Fallback: cache 1 phút nếu không parse được JWT
            tokenExpiresAt = Date.now() + 60000;
          }
        } else {
          cachedToken = null;
          tokenExpiresAt = 0;
          if (typeof window !== 'undefined') {
            localStorage.removeItem('bds_auth_token');
          }
        }
        return cachedToken;
      } catch (error) {
        console.error('Lỗi khi tải token cho Supabase client:', error);
        
        // Offline fallback
        const localToken = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
        if (localToken) {
          try {
            const payload = JSON.parse(atob(localToken.split('.')[1]));
            if (Date.now() < payload.exp * 1000) {
              cachedToken = localToken;
              tokenExpiresAt = payload.exp * 1000;
              return cachedToken;
            }
          } catch {}
        }
        
        return null;
      } finally {
        tokenPromise = null;
      }
    })();
  }

  return tokenPromise;
}

/**
 * Kiểm tra người dùng có đang đăng nhập không (dựa vào cachedToken).
 * Dùng thay cho supabase.auth.getSession() vì client này dùng accessToken option.
 */
export async function isUserLoggedIn(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}


const _browserClient =
  typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey
    ? createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      accessToken: getAccessToken,
    })
    : null;

/**
 * Supabase Browser Client — dùng cho Client Components.
 * Nếu biến môi trường chưa sẵn sàng trong build, client sẽ hoạt động như một stub an toàn
 * để tránh crash build; khi env có giá trị, sẽ dùng client thật.
 */
export const supabase = new Proxy({} as any, {
  get(_target, prop) {
    // Luôn dùng cùng một instance — không tạo mới mỗi lần get
    const client = _browserClient;

    if (!client) {
      if (prop === 'auth') {
        return new Proxy(
          {},
          {
            get(_authTarget, authProp) {
              return async () => ({
                data: { user: null },
                error: new Error('Supabase is not configured'),
              });
            },
          }
        );
      }

      return async () => ({
        data: null,
        error: new Error('Supabase is not configured'),
      });
    }

    return (client as any)[prop];
  },

});

