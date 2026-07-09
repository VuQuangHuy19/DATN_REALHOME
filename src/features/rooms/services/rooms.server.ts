import { supabaseAdmin } from '@/lib/supabase/admin';
import type { DBRoom } from '@/lib/supabase/types';

export async function importRoomsFromSheetServer(companyId: string, csvText: string): Promise<{ imported: number }> {
  if (!csvText?.trim()) return { imported: 0 };

  const rows = csvText
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(1);

  const parsed = rows.map((row) => {
    const [code, floor, roomType] = row.split(',');
    return {
      company_id: companyId,
      code: code?.trim() ?? '',
      floor: Number(floor || 0),
      room_type: roomType?.trim() || 'Phòng trọ',
      size: null,
      price: 0,
      status: 'available' as const,
      bedrooms: 0,
      bathrooms: 0,
      description: null,
      has_private_balcony: false,
      max_occupants: 2,
      max_vehicles_per_room: 2,
      min_contract_months: 12,
    };
  });

  const { error } = await supabaseAdmin.from('rooms').insert(parsed as any);
  if (error) throw error;

  return { imported: parsed.length };
}
