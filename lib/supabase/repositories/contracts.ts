import { supabase } from '../client';
import type { DBContractTemplate } from '../types';

type ContractInsert = Omit<DBContractTemplate, 'id' | 'created_at' | 'updated_at'>;
type ContractUpdate = Partial<ContractInsert>;

export async function getContractTemplates(companyId?: string): Promise<DBContractTemplate[]> {
  let q = supabase.from('contract_templates').select('*').order('created_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as DBContractTemplate[];
}

export async function createContractTemplate(c: ContractInsert): Promise<DBContractTemplate> {
  const { data, error } = await supabase.from('contract_templates').insert(c as any).select().single();
  if (error) throw error;
  return data as unknown as DBContractTemplate;
}

export async function updateContractTemplate(id: string, c: ContractUpdate): Promise<DBContractTemplate> {
  const { data, error } = await supabase
    .from('contract_templates').update({ ...(c as any), updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data as unknown as DBContractTemplate;
}

export async function deleteContractTemplate(id: string) {
  const { error } = await supabase.from('contract_templates').delete().eq('id', id);
  if (error) throw error;
}
