import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function createSafeAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const supabaseAdmin = new Proxy({} as any, {
  get(_target, prop) {
    const client = createSafeAdminClient();

    if (!client) {
      throw new Error('Supabase admin is not configured. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.');
    }

    return (client as any)[prop];
  },
});
