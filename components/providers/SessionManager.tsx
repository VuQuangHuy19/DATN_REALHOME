'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 60 phút không thao tác -> tự động đăng xuất
const SILENT_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 phút kiểm tra gia hạn 1 lần
const IDLE_CHECK_INTERVAL_MS = 30 * 1000; // 30 giây kiểm tra đếm ngược idle 1 lần

// Các route công khai không áp dụng auto-logout khi bất động
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export function SessionManager() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const isRefreshingRef = useRef<boolean>(false);

  // 1. Lắng nghe các sự kiện thao tác của người dùng trên toàn ứng dụng
  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    // Throttle cập nhật timestamp mỗi 2 giây để đảm bảo tối ưu hiệu năng
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledHandler = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          handleUserActivity();
          throttleTimeout = null;
        }, 2000);
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, throttledHandler, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, throttledHandler);
      });
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, []);

  // 2. Kiểm tra thời gian không hoạt động (Idle Timeout 60 phút)
  useEffect(() => {
    if (!user) return; // Chỉ theo dõi khi đã đăng nhập
    if (PUBLIC_PATHS.some((path) => pathname?.startsWith(path))) return;

    const interval = setInterval(async () => {
      const idleTime = Date.now() - lastActivityRef.current;

      if (idleTime >= IDLE_TIMEOUT_MS) {
        console.warn('Phiên đăng nhập đã hết hạn do không có hoạt động trong 60 phút.');
        clearInterval(interval);
        await signOut();
        router.push('/login?expired=idle');
      }
    }, IDLE_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user, pathname, signOut, router]);

  // 3. Gia hạn ngầm JWT (Silent Refresh) nếu có hoạt động gần đây
  useEffect(() => {
    if (!user) return;
    if (PUBLIC_PATHS.some((path) => pathname?.startsWith(path))) return;

    const refreshInterval = setInterval(async () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;

      // Nếu người dùng có hoạt động trong khoảng 15 phút vừa qua và không đang refresh
      if (timeSinceLastActivity < 15 * 60 * 1000 && !isRefreshingRef.current) {
        try {
          isRefreshingRef.current = true;
          const localToken = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (localToken) {
            headers['Authorization'] = `Bearer ${localToken}`;
          }

          const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.token && typeof window !== 'undefined') {
              localStorage.setItem('bds_auth_token', data.token);
            }
          } else if (res.status === 401) {
            // Token hết hạn hoàn toàn hoặc bị vô hiệu hóa ở server
            await signOut();
            router.push('/login?expired=unauthorized');
          }
        } catch (err) {
          console.error('Lỗi khi gia hạn token ngầm:', err);
        } finally {
          isRefreshingRef.current = false;
        }
      }
    }, SILENT_REFRESH_INTERVAL_MS);

    return () => clearInterval(refreshInterval);
  }, [user, pathname, signOut, router]);

  return null;
}
