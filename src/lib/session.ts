import { verifyJWT } from '@/lib/auth-utils';

function parseCookie(cookieString: string, key: string): string | null {
  const pairs = cookieString.split(';');
  for (const pair of pairs) {
    const [k, v] = pair.split('=');
    if (k.trim() === key) {
      return decodeURIComponent(v.trim());
    }
  }
  return null;
}

export interface SessionUser {
  id: string;
  company_id?: string;
  role: string;
  email?: string;
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseCookie(cookieHeader, 'auth_token');
    if (!token) return null;

    const payload = await verifyJWT(token);
    if (!payload || !payload.id) return null;

    return {
      id: payload.id,
      company_id: payload.company_id,
      role: payload.user_role || payload.role,
      email: payload.email,
    };
  } catch (error) {
    console.error('Error in getSessionUser:', error);
    return null;
  }
}
