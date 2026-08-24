import { supabase } from '../client';
import type { DBContractTemplate } from '../types';
import {
  DEFAULT_DEPOSIT_TEMPLATE,
  DEFAULT_RENTAL_TEMPLATE,
  DEFAULT_HANDOVER_TEMPLATE,
  DEFAULT_INVOICE_TEMPLATE,
  DEFAULT_MAINTENANCE_TEMPLATE,
} from '@/features/finance/services/contract_templates';

type ContractInsert = Omit<DBContractTemplate, 'id' | 'created_at' | 'updated_at'>;
type ContractUpdate = Partial<ContractInsert>;

const DEFAULT_TEMPLATES: DBContractTemplate[] = [
  {
    id: 'default-deposit',
    company_id: null,
    name: 'Mẫu hợp đồng đặt cọc giữ chỗ (A4 chuẩn)',
    type: 'deposit',
    content: DEFAULT_DEPOSIT_TEMPLATE,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'default-rental',
    company_id: null,
    name: 'Mẫu hợp đồng thuê phòng chính thức (A4 chuẩn)',
    type: 'rental',
    content: DEFAULT_RENTAL_TEMPLATE,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'default-handover',
    company_id: null,
    name: 'Biên bản bàn giao phòng & trang thiết bị',
    type: 'handover',
    content: DEFAULT_HANDOVER_TEMPLATE,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'default-invoice',
    company_id: null,
    name: 'Phiếu bảng kê hóa đơn tiền nhà & dịch vụ',
    type: 'invoice',
    content: DEFAULT_INVOICE_TEMPLATE,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'default-maintenance',
    company_id: null,
    name: 'Phiếu tiếp nhận & bảo trì sửa chữa',
    type: 'maintenance',
    content: DEFAULT_MAINTENANCE_TEMPLATE,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

export async function getContractTemplates(companyId?: string): Promise<DBContractTemplate[]> {
  try {
    let q = supabase.from('contract_templates').select('*').order('created_at', { ascending: false });
    if (companyId) q = q.eq('company_id', companyId);
    const { data, error } = await q;
    if (error) {
      return DEFAULT_TEMPLATES;
    }
    const dbList = (data ?? []) as unknown as DBContractTemplate[];
    return dbList.length > 0 ? dbList : DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export async function createContractTemplate(c: ContractInsert): Promise<DBContractTemplate> {
  try {
    const { data, error } = await supabase.from('contract_templates').insert(c as any).select().single();
    if (error) throw error;
    return data as unknown as DBContractTemplate;
  } catch (err: any) {
    throw new Error(`Bảng 'contract_templates' chưa tồn tại trong Supabase Database. Chi tiết: ${err.message}`);
  }
}

export async function updateContractTemplate(id: string, c: ContractUpdate): Promise<DBContractTemplate> {
  try {
    const { data, error } = await supabase
      .from('contract_templates').update({ ...(c as any), updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    return data as unknown as DBContractTemplate;
  } catch (err: any) {
    throw new Error(`Không thể cập nhật mẫu hợp đồng: ${err.message}`);
  }
}

export async function deleteContractTemplate(id: string) {
  try {
    const { error } = await supabase.from('contract_templates').delete().eq('id', id);
    if (error) throw error;
  } catch (err: any) {
    console.error('Lỗi xóa contract template:', err);
  }
}
