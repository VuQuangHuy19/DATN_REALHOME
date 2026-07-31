import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('Checking bank_accounts column in landlords table...');
  const { data, error } = await supabase
    .from('landlords')
    .select('id, bank_name, bank_account_number, bank_account_owner, bank_accounts')
    .limit(1);

  if (error) {
    console.log('Error selecting bank_accounts (might not exist yet):', error.message);
  } else {
    console.log('Selected sample landlord:', data);
  }
}

main().catch(console.error);
