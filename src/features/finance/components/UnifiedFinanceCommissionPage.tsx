'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ProfitReportPage } from './ProfitReportPage';
import { CommissionPoliciesComponent } from './CommissionPoliciesComponent';
import { InvoicesPage } from './InvoicesPage';
import { ServiceReadingsPage } from '@/features/services/components/ServiceReadingsPage';
import { Calculator, Sliders, DollarSign, FileText, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  defaultTab?: 'profit' | 'policy' | 'invoices' | 'readings';
}

export function UnifiedFinanceCommissionPage({ defaultTab = 'invoices' }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const queryTab = searchParams?.get('tab') as 'profit' | 'policy' | 'invoices' | 'readings' | null;
  const [activeTab, setActiveTab] = useState<'profit' | 'policy' | 'invoices' | 'readings'>(queryTab || defaultTab);

  useEffect(() => {
    if (queryTab) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  const handleTabChange = (tab: 'profit' | 'policy' | 'invoices' | 'readings') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const isServicesScope = activeTab === 'invoices' || activeTab === 'readings' || defaultTab === 'invoices' || defaultTab === 'readings';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Sub-tabs header for Services (Invoices & Readings) */}
      {isServicesScope && (
        <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800/60 p-1.5 rounded-xl border border-border">
            <button
              onClick={() => handleTabChange('readings')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs",
                activeTab === 'readings'
                  ? "bg-white text-accent shadow-sm border border-border/80"
                  : "text-ink-muted hover:text-ink hover:bg-slate-200/50"
              )}
            >
              <Zap className={cn("h-4 w-4", activeTab === 'readings' ? "text-amber-500 fill-amber-400" : "")} />
              1. Chốt chỉ số Điện/Nước
            </button>
            <button
              onClick={() => handleTabChange('invoices')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs",
                activeTab === 'invoices'
                  ? "bg-white text-accent shadow-sm border border-border/80"
                  : "text-ink-muted hover:text-ink hover:bg-slate-200/50"
              )}
            >
              <FileText className={cn("h-4 w-4", activeTab === 'invoices' ? "text-emerald-500 fill-emerald-400" : "")} />
              2. Danh sách & Lập Hóa Đơn
            </button>
          </div>
        </div>
      )}

      {/* Render Active Tab Component */}
      {activeTab === 'profit' && <ProfitReportPage />}
      {activeTab === 'policy' && <CommissionPoliciesComponent />}
      {activeTab === 'invoices' && <InvoicesPage />}
      {activeTab === 'readings' && <ServiceReadingsPage />}
    </div>
  );
}
