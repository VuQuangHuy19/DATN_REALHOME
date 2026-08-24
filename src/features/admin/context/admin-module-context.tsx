'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type AdminModuleId = 'all' | 'supply' | 'sales' | 'finance' | 'governance';

export interface ModuleBadgeCounts {
  supply: number;
  sales: number;
  finance: number;
  governance: number;
}

interface AdminModuleContextType {
  activeModule: AdminModuleId;
  setActiveModule: (module: AdminModuleId) => void;
  badgeCounts: ModuleBadgeCounts;
  setBadgeCounts: React.Dispatch<React.SetStateAction<ModuleBadgeCounts>>;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

const AdminModuleContext = createContext<AdminModuleContextType | undefined>(undefined);

const STORAGE_KEY = 'realhome_admin_active_module';
const SIDEBAR_COLLAPSED_KEY = 'realhome_admin_sidebar_collapsed';

export function AdminModuleProvider({ children }: { children: React.ReactNode }) {
  const [activeModule, setActiveModuleState] = useState<AdminModuleId>('all');
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState<boolean>(true); // Default collapsed on 'all' as requested
  const [badgeCounts, setBadgeCounts] = useState<ModuleBadgeCounts>({
    supply: 5,
    sales: 12,
    finance: 3,
    governance: 1,
  });

  useEffect(() => {
    try {
      const savedModule = localStorage.getItem(STORAGE_KEY) as AdminModuleId | null;
      if (savedModule && ['all', 'supply', 'sales', 'finance', 'governance'].includes(savedModule)) {
        setActiveModuleState(savedModule);
      }

      const savedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (savedCollapsed !== null) {
        setIsSidebarCollapsedState(savedCollapsed === 'true');
      } else {
        // Default: if on 'all', default to collapsed
        setIsSidebarCollapsedState(savedModule === 'all' || !savedModule);
      }
    } catch (e) {
      console.error('Failed to load active module / sidebar preference from localStorage', e);
    }
  }, []);

  const setActiveModule = (module: AdminModuleId) => {
    setActiveModuleState(module);
    try {
      localStorage.setItem(STORAGE_KEY, module);
    } catch (e) {
      console.error('Failed to save active module to localStorage', e);
    }
  };

  const setIsSidebarCollapsed = (collapsed: boolean) => {
    setIsSidebarCollapsedState(collapsed);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch (e) {
      console.error('Failed to save sidebar collapsed state to localStorage', e);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <AdminModuleContext.Provider
      value={{
        activeModule,
        setActiveModule,
        badgeCounts,
        setBadgeCounts,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
      }}
    >
      {children}
    </AdminModuleContext.Provider>
  );
}

export function useAdminModule() {
  const context = useContext(AdminModuleContext);
  if (!context) {
    throw new Error('useAdminModule must be used within an AdminModuleProvider');
  }
  return context;
}
