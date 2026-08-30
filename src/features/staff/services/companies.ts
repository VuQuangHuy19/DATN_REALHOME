import { supabase } from '@/lib/supabase/client';
import { authFetch } from '@/lib/supabase/auth-fetch';
import type { DBCompany } from '@/lib/supabase/types';

export type CompanyInsert = Omit<DBCompany, 'id' | 'created_at' | 'updated_at'>;
export type CompanyUpdate = Partial<CompanyInsert>;

export async function getCompanies(): Promise<DBCompany[]> {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!companies || companies.length === 0) return [];

  // Lấy số lượng tài khoản nhân sự active thực tế từ bảng profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('is_active', true)
    .in('role', ['company_admin', 'manager', 'sales_agent', 'employee']);

  // Lấy số lượng bất động sản (tòa nhà) thực tế từ bảng buildings
  const { data: buildings } = await supabase
    .from('buildings')
    .select('company_id');

  const userCounts: Record<string, number> = {};
  if (profiles) {
    for (const p of profiles) {
      if (p.company_id) {
        userCounts[p.company_id] = (userCounts[p.company_id] || 0) + 1;
      }
    }
  }

  const propertyCounts: Record<string, number> = {};
  if (buildings) {
    for (const b of buildings) {
      if (b.company_id) {
        propertyCounts[b.company_id] = (propertyCounts[b.company_id] || 0) + 1;
      }
    }
  }

  return companies.map((c) => ({
    ...c,
    total_users: userCounts[c.id] ?? c.total_users ?? 0,
    total_properties: propertyCounts[c.id] ?? c.total_properties ?? 0,
  })) as unknown as DBCompany[];
}

export async function getCompany(id: string): Promise<DBCompany | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as DBCompany | null;
}

// ĐÃ SỬA: Chuyển từ gọi Supabase client sang gọi API Server của Next.js
export async function createCompany(company: CompanyInsert): Promise<DBCompany> {
  const response = await authFetch('/api/companies/create', {
    method: 'POST',
    body: JSON.stringify(company),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Đã xảy ra lỗi khi tạo công ty và tài khoản');
  }

  const data = await response.json();
  return data as DBCompany;
}

export async function updateCompany(id: string, updates: CompanyUpdate): Promise<DBCompany> {
  const response = await authFetch('/api/companies/update', {
    method: 'PUT',
    body: JSON.stringify({ id, ...updates }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Đã xảy ra lỗi khi cập nhật công ty');
  }

  const data = await response.json();
  return data as DBCompany;
}

export async function deleteCompany(id: string) {
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw error;
}

export async function getCompanyStats() {
  const { data: companies } = await supabase.from('companies').select('status, plan') as { data: { status: string; plan: string }[] | null };
  if (!companies) return { total: 0, active: 0, trial: 0, suspended: 0, byPlan: {} as Record<string, number> };
  return {
    total: companies.length,
    active: companies.filter((c) => c.status === 'active').length,
    trial: companies.filter((c) => c.status === 'trial').length,
    suspended: companies.filter((c) => c.status === 'suspended').length,
    byPlan: companies.reduce((acc: Record<string, number>, c) => {
      acc[c.plan] = (acc[c.plan] || 0) + 1;
      return acc;
      }, {}),
  };
}
