import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Let's check company f0c99e51-af95-4b08-baa8-15b91c67a58c
  const { data: comp } = await supabase
    .from('companies')
    .select('*')
    .eq('id', 'f0c99e51-af95-4b08-baa8-15b91c67a58c')
    .single();

  console.log('Company:', comp);

  const { data: activeProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active, company_id')
    .eq('company_id', 'f0c99e51-af95-4b08-baa8-15b91c67a58c')
    .eq('is_active', true);

  console.log('Active profiles in this company (count = ' + activeProfiles?.length + '):', activeProfiles);
}

main().catch(console.error);
