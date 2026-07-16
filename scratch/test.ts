import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'e:/BDS/bds1/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const companyId = 'f0c99e51-af95-4b08-baa8-15b91c67a58c';
  const saleId = 'd6b22561-b0aa-48d8-9829-5fb332109ce1';
  
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);
  const in30DaysStr = in30Days.toISOString().slice(0, 10);
  
  console.log("todayStr:", todayStr);
  console.log("in30DaysStr:", in30DaysStr);

  const { data, error } = await supabase
      .from('rental_contracts')
      .select('id, contract_code, party_b_name, party_b_phone, end_date, room_id, rooms(id, code, building_id, buildings(name)), created_by, sales_agent_id')
      .eq('company_id', companyId)
      // .eq('created_by', saleId)
      .eq('status', 'active')
      .gte('end_date', todayStr)
      .lte('end_date', in30DaysStr)
      .order('end_date', { ascending: true });

  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}

test();
