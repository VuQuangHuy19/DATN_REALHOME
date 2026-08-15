'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { resolveCompaniesFromSources } from '@/lib/supabase/repositories/tenant';
import type { PublicCompany } from '@/lib/supabase/repositories/tenant';
import { useAuth } from '@/lib/auth/AuthContext';

type CustomerCompanyContextValue = {
  company: PublicCompany | null;
  companies: PublicCompany[];
  loading: boolean;
  error: string | null;
};

const CustomerCompanyContext = createContext<CustomerCompanyContextValue>({
  company: null,
  companies: [],
  loading: true,
  error: null,
});

export function useCustomerCompany() {
  return useContext(CustomerCompanyContext);
}

export function CustomerCompanyProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const { profile, loading: authLoading } = useAuth();

  // Query param: ?company=<domain> — dùng cho local dev / testing
  const queryParam = searchParams?.get('company');

  const [company, setCompany] = useState<PublicCompany | null>(null);
  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    setLoading(true);

    // Đọc subdomain từ meta tag được inject bởi layout (server-side header → meta)
    // Hoặc đọc từ window.location.hostname trực tiếp ở client
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || '';
    let subdomain: string | null = null;

    if (
      hostname &&
      hostname !== 'localhost' &&
      !hostname.startsWith('127.') &&
      !hostname.startsWith('192.168.')
    ) {
      if (rootDomain && hostname.endsWith(`.${rootDomain}`)) {
        subdomain = hostname.slice(0, -(rootDomain.length + 1));
      } else if (hostname !== rootDomain) {
        // Custom domain hoàn toàn
        subdomain = hostname;
      }
    }

    resolveCompaniesFromSources({ subdomain, queryParam })
      .then((resolved) => {
        let finalCompanies = resolved;

        // Chỉ lọc 1 công ty nếu có subdomain hoặc queryParam chỉ định cụ thể
        if ((subdomain || queryParam) && profile?.company_id && ['company_admin', 'manager', 'sales_agent'].includes(profile.role)) {
          const userComp = resolved.filter(c => c.id === profile.company_id);
          if (userComp.length > 0) finalCompanies = userComp;
        }

        setCompanies(finalCompanies);
        setCompany(finalCompanies.length > 0 ? finalCompanies[0] : null);
        
        if (finalCompanies.length === 0 && resolved.length > 0) {
          setError('Bạn không có quyền xem thông tin công ty này.');
        } else {
          setError(finalCompanies.length > 0 ? null : 'Không tìm thấy công ty');
        }
      })
      .catch((e) => {
        setCompanies([]);
        setCompany(null);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [queryParam, authLoading, profile?.company_id, profile?.role]);

  return (
    <CustomerCompanyContext.Provider value={{ company, companies, loading, error }}>
      {children}
    </CustomerCompanyContext.Provider>
  );
}
