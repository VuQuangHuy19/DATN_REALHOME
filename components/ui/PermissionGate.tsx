'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePathname } from 'next/navigation';

type UserRole = 'super_admin' | 'company_admin' | 'manager' | 'sales_agent' | 'landlord';

interface PermissionGateProps {
  /** Danh sách roles được phép thấy nội dung bên trong */
  roles: UserRole[];
  /** Nội dung hiển thị khi có quyền */
  children: React.ReactNode;
  /** Nội dung thay thế khi không có quyền (mặc định: null – ẩn hoàn toàn) */
  fallback?: React.ReactNode;
}

/**
 * Hiển thị children chỉ khi role của user hiện tại nằm trong danh sách `roles`.
 *
 * @example
 * <PermissionGate roles={['company_admin', 'manager']}>
 *   <Button>Thêm phòng</Button>
 * </PermissionGate>
 *
 * // Với fallback UI:
 * <PermissionGate roles={['company_admin']} fallback={<span>Không có quyền</span>}>
 *   <Button>Xóa</Button>
 * </PermissionGate>
 */
export function PermissionGate({ roles, children, fallback = null }: PermissionGateProps) {
  const { role, loading } = useAuth();
  const pathname = usePathname();

  // Đang tải session → không render gì để tránh flash
  if (loading) return null;

  // super_admin luôn có toàn quyền, không cần khai báo trong roles
  if (role === 'super_admin') return <>{children}</>;

  // Nếu đang ở cổng landlord và người dùng là landlord, cho phép hiển thị các nút CRUD
  if (pathname?.startsWith('/landlord') && role === 'landlord') {
    return <>{children}</>;
  }

  if (!role || !roles.includes(role as UserRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

