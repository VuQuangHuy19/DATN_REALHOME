import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth/AuthContext';

export const metadata: Metadata = {
  title: 'RealHome',
  description: 'Hệ thống quản lý bất động sản toàn diện',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
