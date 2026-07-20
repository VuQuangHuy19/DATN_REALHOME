/**
 * Landlords repository — gọi qua Next.js API Routes (server-side)
 * để đảm bảo đi qua service role key, bypass Supabase RLS.
 */
import type { DBLandlord } from '../types';

type LandlordInsert = Omit<DBLandlord, 'id' | 'created_at' | 'updated_at'>;
type LandlordUpdate = Partial<LandlordInsert>;

export async function getLandlords(companyId?: string): Promise<DBLandlord[]> {
  const url = companyId
    ? `/api/landlords?companyId=${encodeURIComponent(companyId)}`
    : '/api/landlords';

  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Không thể lấy danh sách chủ nhà');
  }
  const body = await res.json();
  return body.data as DBLandlord[];
}

export async function createLandlord(l: LandlordInsert): Promise<DBLandlord> {
  const res = await fetch('/api/landlords', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(l),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Không thể tạo chủ nhà');
  }
  const body = await res.json();
  return body.data as DBLandlord;
}

export async function updateLandlord(id: string, l: LandlordUpdate): Promise<DBLandlord> {
  const res = await fetch(`/api/landlords/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(l),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Không thể cập nhật chủ nhà');
  }
  const body = await res.json();
  return body.data as DBLandlord;
}

export async function deleteLandlord(id: string): Promise<void> {
  const res = await fetch(`/api/landlords/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Không thể xóa chủ nhà');
  }
}
