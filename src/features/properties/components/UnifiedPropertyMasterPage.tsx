'use client';

import React, { useState } from 'react';
import { BuildingListPage } from './BuildingListPage';
import { LandlordsComponent } from './LandlordsComponent';
import { ManagerListPage } from '@/src/features/managers/components/ManagerListPage';
import { CategoriesPage } from '@/src/features/categories/components/CategoriesPage';
import { Building2, Users, UserCog, Layers, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  defaultTab?: 'buildings' | 'landlords' | 'managers' | 'categories';
}

export function UnifiedPropertyMasterPage({ defaultTab = 'buildings' }: Props) {
  const [activeTab] = useState<'buildings' | 'landlords' | 'managers' | 'categories'>(defaultTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Render Active Master Tab */}
      {activeTab === 'buildings' && <BuildingListPage />}
      {activeTab === 'landlords' && <LandlordsComponent />}
      {activeTab === 'managers' && <ManagerListPage />}
      {activeTab === 'categories' && <CategoriesPage />}
    </div>
  );
}

