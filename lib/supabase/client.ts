import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Singleton browser client — chỉ khởi tạo 1 lần duy nhất khi module được load.
 * Việc dùng singleton đảm bảo supabase.channel() và supabase.removeChannel()
 * luôn hoạt động trên cùng một instance, tránh leak subscription realtime.
 */
const _browserClient =
  typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey
    ? createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
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
