/**
 * lib/rate-limit.ts
 *
 * In-memory rate limiter dùng Map — không cần Redis, phù hợp dự án nhỏ.
 * Lưu ý: Map bị reset khi server restart/redeploy. Nếu sau này scale
 * multi-instance, cần chuyển sang Redis (ioredis + sliding window).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix ms
}

// Module-level store — sống trong suốt vòng đời process Node.js
const store = new Map<string, RateLimitEntry>();

/**
 * Lấy IP từ request.
 * Ưu tiên: x-forwarded-for (phía sau reverse proxy) > x-real-ip > fallback "unknown".
 */
function getClientIp(request: Request): string {
  const xff = (request.headers as Headers).get('x-forwarded-for');
  if (xff) {
    // x-forwarded-for có thể là danh sách IP cách nhau dấu phẩy
    return xff.split(',')[0].trim();
  }
  const xri = (request.headers as Headers).get('x-real-ip');
  if (xri) return xri.trim();
  return 'unknown';
}

/**
 * Dọn các entry đã hết hạn để tránh memory leak.
 * Gọi mỗi khi checkRateLimit được gọi (amortized O(n) — ổn với traffic nhỏ).
 */
function cleanExpired(): void {
  const now = Date.now();
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  });
}

export interface RateLimitOptions {
  /** Số request tối đa trong mỗi cửa sổ thời gian */
  limit: number;
  /** Độ rộng cửa sổ thời gian (ms) */
  windowMs: number;
}

export interface RateLimitResult {
  /** true = cho phép request đi qua */
  allowed: boolean;
  /** Số request còn lại trong cửa sổ hiện tại */
  remaining: number;
  /** Số giây phải chờ trước khi thử lại (chỉ có ý nghĩa khi allowed = false) */
  retryAfterSeconds: number;
}

/**
 * Kiểm tra rate limit cho một request.
 *
 * @param request - Next.js / Web API Request object
 * @param key     - Tên định danh route/action (ví dụ: "appointments-public")
 * @param options - { limit, windowMs }
 *
 * @example
 * const rl = checkRateLimit(request, 'appointments-public', { limit: 5, windowMs: 10 * 60 * 1000 });
 * if (!rl.allowed) return NextResponse.json({ error: '...' }, { status: 429 });
 */
export function checkRateLimit(
  request: Request,
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  cleanExpired();

  const ip = getClientIp(request);
  const storeKey = `${key}:${ip}`;
  const now = Date.now();

  const entry = store.get(storeKey);

  if (!entry || entry.resetAt <= now) {
    // Cửa sổ mới
    store.set(storeKey, { count: 1, resetAt: now + options.windowMs });
    return {
      allowed: true,
      remaining: options.limit - 1,
      retryAfterSeconds: 0,
    };
  }

  if (entry.count >= options.limit) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  // Còn trong cửa sổ, tăng count
  entry.count += 1;
  store.set(storeKey, entry);

  return {
    allowed: true,
    remaining: options.limit - entry.count,
    retryAfterSeconds: 0,
  };
}
