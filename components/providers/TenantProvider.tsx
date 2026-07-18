'use client';

import React, { createContext, useContext } from 'react';

export interface TenantContextType {
  name?: string;
  domain?: string | null;
  logo_url?: string | null;
  theme_color?: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({
  children,
  tenant,
}: {
  children: React.ReactNode;
  tenant: TenantContextType | null;
}) {
  return (
    <TenantContext.Provider value={tenant || {}}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    return {}; // fallback for missing provider
  }
  return context;
};
