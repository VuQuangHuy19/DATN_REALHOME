import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) {
    process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

import { supabaseAdmin } from './src/lib/supabase/admin';

async function main() {
  const id = '661d76b6-9113-44c4-8848-ac8384739788';
  const { data: bldg, error } = await supabaseAdmin
    .from('buildings')
    .select('*')
    .eq('id', id)
    .single();

  console.log('Building details:', bldg, error);
}

main().catch(console.error);
