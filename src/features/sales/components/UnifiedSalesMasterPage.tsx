'use client';

import React, { useState } from 'react';
import { LeadsPage } from './LeadsPage';
import { AppointmentsPage } from './AppointmentsPage';
import { ContractsPage } from '@/features/finance/components/ContractsPage';
import { Users, Calendar, FileText, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  defaultTab?: 'leads' | 'appointments' | 'contracts';
}

export function UnifiedSalesMasterPage({ defaultTab = 'leads' }: Props) {
  const [activeTab] = useState<'leads' | 'appointments' | 'contracts'>(defaultTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Render Active Master Tab */}
      {activeTab === 'leads' && <LeadsPage />}
      {activeTab === 'appointments' && <AppointmentsPage />}
      {activeTab === 'contracts' && <ContractsPage />}
    </div>
  );
}

