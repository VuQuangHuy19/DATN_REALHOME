import { supabaseAdmin } from '@/lib/supabase/admin';

export interface PushSubscriptionRow {
  id: string;
  company_id: string;
  profile_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  updated_at: string;
}

/**
 * Lưu đăng ký Web Push vào DB
 */
export async function saveSubscription(
  profileId: string,
  companyId: string,
  endpoint: string,
  p256dh: string,
  auth: string
): Promise<void> {
  // Upsert dựa trên endpoint để tránh trùng lặp cùng 1 thiết bị
  // Supabase REST không dễ upsert nếu không có UNIQUE constraint trên endpoint,
  // Nên ta xoá cũ nếu có rồi insert mới.
  await supabaseAdmin
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  const { error } = await supabaseAdmin
    .from('push_subscriptions')
    .insert({
      profile_id: profileId,
      company_id: companyId,
      endpoint,
      p256dh,
      auth
    });

  if (error) {
    console.error('[PushSubscriptions] Lỗi lưu subscription:', error);
    throw new Error('Lỗi lưu đăng ký thông báo');
  }
}

/**
 * Lấy danh sách đăng ký Web Push của 1 user
 */
export async function getSubscriptionsByProfileId(profileId: string): Promise<PushSubscriptionRow[]> {
  const { data, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('profile_id', profileId);

  if (error) {
    console.error('[PushSubscriptions] Lỗi lấy subscriptions theo profile:', error);
    return [];
  }
  return data as PushSubscriptionRow[];
}

/**
 * Lấy toàn bộ đăng ký Web Push của 1 company
 */
export async function getSubscriptionsByCompanyId(companyId: string): Promise<PushSubscriptionRow[]> {
  const { data, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('company_id', companyId);

  if (error) {
    console.error('[PushSubscriptions] Lỗi lấy subscriptions theo company:', error);
    return [];
  }
  return data as PushSubscriptionRow[];
}

/**
 * Xoá đăng ký Web Push (thường gọi khi server nhận lỗi 410 Gone từ trình duyệt)
 */
export async function deleteSubscription(endpoint: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (error) {
    console.error('[PushSubscriptions] Lỗi xoá subscription:', error);
  }
}
