const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = 'd:/HAUI/DATN/DATN_REALHOME/.env.local';
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
}

loadEnv();

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: leads } = await supabaseAdmin.from('leads').select('*');
  const { data: apts } = await supabaseAdmin.from('appointments').select('*');
  const { data: cons } = await supabaseAdmin.from('consultations').select('*');
  
  console.log('Leads count:', leads ? leads.length : 0);
  console.log('Leads sample:', leads ? leads.slice(0, 3) : []);
  console.log('Appointments count:', apts ? apts.length : 0);
  console.log('Appointments sample:', apts ? apts.slice(0, 3) : []);
  console.log('Consultations count:', cons ? cons.length : 0);
}

main();
