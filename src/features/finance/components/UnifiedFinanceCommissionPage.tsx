'use client';

import React, { useState } from 'react';
import { ProfitReportPage } from './ProfitReportPage';
import { CommissionPoliciesComponent } from './CommissionPoliciesComponent';
import { InvoicesPage } from './InvoicesPage';
import { ServiceReadingsPage } from '@/features/services/components/ServiceReadingsPage';
import { Calculator, Sliders, DollarSign, FileText, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  defaultTab?: 'profit' | 'policy' | 'invoices' | 'readings';
}

export function UnifiedFinanceCommissionPage({ defaultTab = 'profit' }: Props) {
  const [activeTab] = useState<'profit' | 'policy' | 'invoices' | 'readings'>(defaultTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Render Active Tab Component */}
      {activeTab === 'profit' && <ProfitReportPage />}
      {activeTab === 'policy' && <CommissionPoliciesComponent />}
      {activeTab === 'invoices' && <InvoicesPage />}
      {activeTab === 'readings' && <ServiceReadingsPage />}
    </div>
  );
}

