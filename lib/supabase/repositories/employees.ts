import { supabase } from '../client';
import { authFetch } from '../auth-fetch';
import type { DBEmployee } from '../types';

type EmployeeInsert = Omit<DBEmployee, 'id' | 'created_at' | 'updated_at'>;
type EmployeeUpdate = Partial<EmployeeInsert>;

export async function getEmployees(companyId?: string): Promise<DBEmployee[]> {
  let q = supabase.from('employees').select('*').order('created_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as DBEmployee[];
}

export async function createEmployee(e: EmployeeInsert): Promise<DBEmployee> {
  const { data, error } = await supabase.from('employees').insert(e as any).select().single();
  if (error) throw error;
  return data as unknown as DBEmployee;
}

export async function updateEmployee(id: string, e: EmployeeUpdate): Promise<DBEmployee> {
  // Dùng API route server-side để update cả employees lẫn profiles (bypass RLS với supabaseAdmin)
  const response = await authFetch('/api/employees/update', {
    method: 'POST',
    body: JSON.stringify({ id, ...e }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Lỗi cập nhật nhân viên');
  }

  const data = await response.json();
  return data as DBEmployee;
}

export async function deleteEmployee(id: string, companyId?: string) {
  const response = await authFetch('/api/employees/delete', {
    method: 'POST',
    body: JSON.stringify({ id, company_id: companyId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Lỗi khi xóa nhân sự');
  }
}
