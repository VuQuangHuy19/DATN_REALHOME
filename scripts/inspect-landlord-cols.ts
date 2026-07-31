import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: landlord, error } = await supabase
    .from('landlords')
    .select('*')
    .limit(1)
    .single();

  console.log('Landlord sample record:', landlord);
  console.log('Error if any:', error);
}

main().catch(console.error);
