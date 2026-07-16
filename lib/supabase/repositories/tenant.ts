import { supabase } from '../client';
import type { Database } from '../types';

export type PublicCompany = Pick<
  Database['public']['Tables']['companies']['Row'],
  'id' | 'name' | 'code' | 'phone' | 'address' | 'owner_email'
>;

// ─── Resolve company từ nhiều nguồn ──────────────────────────────────────────

/**
 * Lookup company theo code (cột `code` trong bảng companies).
 */
export async function getCompanyByCode(code: string): Promise<PublicCompany | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, code, phone, address, owner_email')
    .eq('code', code)
    .in('status', ['active', 'trial'])
    .maybeSingle();

  if (error) throw error;
  return data as PublicCompany | null;
}

/**
 * Lấy company đầu tiên (fallback khi không resolve được).
 */
export async function getFirstActiveCompany(): Promise<PublicCompany | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, code, phone, address, owner_email')
    .in('status', ['active', 'trial'])
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as PublicCompany | null;
}

/**
 * Resolve company từ nhiều nguồn theo thứ tự ưu tiên:
 *
 * 1. `subdomain` (từ x-company-domain header — set bởi middleware)
 * 2. `queryParam` (từ ?company=xxx — dùng khi dev local)
 * 3. `NEXT_PUBLIC_DEFAULT_COMPANY_DOMAIN` env variable
 * 4. Company đầu tiên trong DB (ultimate fallback)
 */
export async function resolveCompanyFromSources(options: {
  subdomain?: string | null;
  queryParam?: string | null;
  defaultDomain?: string | null;
}): Promise<PublicCompany | null> {
  const { subdomain, queryParam, defaultDomain } = options;

  // Thứ tự ưu tiên: subdomain > queryParam > defaultDomain
  const candidates = [subdomain, queryParam, defaultDomain].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const company = await getCompanyByCode(candidate.trim());
    if (company) return company;
  }

  // Ultimate fallback: company đầu tiên trong DB
  return getFirstActiveCompany();
}

/**
 * Lấy toàn bộ danh sách các công ty đang hoạt động từ database.
 */
export async function getAllActiveCompanies(): Promise<PublicCompany[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, code, phone, address, owner_email')
    .in('status', ['active', 'trial'])
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as PublicCompany[];
}

/**
 * Resolve nhiều companies từ các nguồn (subdomain, queryParam), 
 * fallback lấy toàn bộ công ty hoạt động trong DB nếu không có bộ lọc cụ thể.
 */
export async function resolveCompaniesFromSources(options: {
  subdomain?: string | null;
  queryParam?: string | null;
}): Promise<PublicCompany[]> {
  const { subdomain, queryParam } = options;

  const parseDomains = (str?: string | null) => {
    if (!str) return [];
    return str.split(',').map(d => d.trim()).filter(Boolean);
  };

  const subdomainCandidates = parseDomains(subdomain);
  const queryCandidates = parseDomains(queryParam);

  const candidates = [...subdomainCandidates, ...queryCandidates];

  if (candidates.length === 0) {
    const fallback = await getFirstActiveCompany();
    return fallback ? [fallback] : [];
  }

  const resolvedCompanies: PublicCompany[] = [];
  const seenIds = new Set<string>();

  for (const candidate of candidates) {
    const company = await getCompanyByCode(candidate);
    if (company && !seenIds.has(company.id)) {
      resolvedCompanies.push(company);
      seenIds.add(company.id);
    }
  }

  if (resolvedCompanies.length === 0) {
    const fallback = await getFirstActiveCompany();
    return fallback ? [fallback] : [];
  }

  return resolvedCompanies;
}

