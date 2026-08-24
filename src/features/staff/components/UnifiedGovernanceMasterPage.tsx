'use client';

import React, { useState } from 'react';
import { EmployeesPage } from './EmployeesPage';
import { KpiPage } from './KpiPage';
import { RolesPage } from './RolesPage';
import { Users, Target, Shield, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  defaultTab?: 'employees' | 'kpi' | 'roles';
}

export function UnifiedGovernanceMasterPage({ defaultTab = 'employees' }: Props) {
  const [activeTab] = useState<'employees' | 'kpi' | 'roles'>(defaultTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Render Active Master Tab */}
      {activeTab === 'employees' && <EmployeesPage />}
      {activeTab === 'kpi' && <KpiPage />}
      {activeTab === 'roles' && <RolesPage />}
    </div>
  );
}

