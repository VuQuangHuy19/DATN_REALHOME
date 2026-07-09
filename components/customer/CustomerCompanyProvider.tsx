'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { resolveCompaniesFromSources } from '@/lib/supabase/repositories/tenant';
import type { PublicCompany } from '@/lib/supabase/repositories/tenant';

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

  // Query param: ?company=<domain> — dùng cho local dev / testing
  const queryParam = searchParams?.get('company');

  const [company, setCompany] = useState<PublicCompany | null>(null);
  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        setCompanies(resolved);
        setCompany(resolved.length > 0 ? resolved[0] : null);
        setError(resolved.length > 0 ? null : 'Không tìm thấy công ty');
      })
      .catch((e) => {
        setCompanies([]);
        setCompany(null);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [queryParam]);

  return (
    <CustomerCompanyContext.Provider value={{ company, companies, loading, error }}>
      {children}
    </CustomerCompanyContext.Provider>
  );
}
