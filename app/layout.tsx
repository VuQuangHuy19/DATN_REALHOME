import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { SessionManager } from '@/components/providers/SessionManager';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AppPreferencesProvider } from '@/components/providers/AppPreferencesProvider';

export const metadata: Metadata = {
  title: 'RealHome',
  description: 'Hệ thống quản lý bất động sản toàn diện',
  manifest: '/manifest.json',
  themeColor: '#2563eb',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RealHome',
  },
};

import { headers } from 'next/headers';
import { getTenantByDomain, getTenantStyleVariables } from '@/lib/tenant-utils';
import { TenantProvider } from '@/components/providers/TenantProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = headers();
  const domain = headersList.get('x-company-domain');
  const tenant = await getTenantByDomain(domain);
  const styleVariables = getTenantStyleVariables(tenant?.theme_color);

  return (
    <html lang="vi" suppressHydrationWarning style={styleVariables}>
      <body>
        <TenantProvider tenant={tenant}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AppPreferencesProvider>
              <AuthProvider>
                <SessionManager />
                {children}
              </AuthProvider>
            </AppPreferencesProvider>
            <Toaster richColors position="top-center" />
          </ThemeProvider>
        </TenantProvider>
      </body>
    </html>
  );
}
