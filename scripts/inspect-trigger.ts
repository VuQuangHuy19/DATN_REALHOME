import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('--- INSPECTING PROFILES & TRIGGERS ---');
  
  // 1. Get sample profiles
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name, role, company_id')
    .limit(20);
  
  console.log('Profiles:', profiles);

  // 2. Try updating each profile to test trigger
  if (profiles && profiles.length > 0) {
    for (const p of profiles) {
      console.log(`\nTesting update profile id=${p.id}, role=${p.role}, company_id=${p.company_id}, name=${p.full_name}...`);
      const { data: updData, error: updErr } = await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', p.id)
        .select();

      if (updErr) {
        console.error('FAIL update:', updErr);
      } else {
        console.log('SUCCESS update:', updData);
      }
    }
  }

  // 3. Inspect active subscriptions
  const { data: subs } = await supabase.from('subscriptions').select('*');
  console.log('\nSubscriptions:', subs);
}

main().catch(console.error);
