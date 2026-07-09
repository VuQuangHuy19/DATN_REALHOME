import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';

// Các role được toàn quyền, không cần kiểm tra role_permissions
const ADMIN_ROLES = ['super_admin', 'company_admin'];

/**
 * Hook kiểm tra quyền thao tác của user hiện tại.
 *
 * Phase 1: super_admin và company_admin luôn trả về true.
 * Phase 2: map với bảng roles (permissions array) và role_permissions theo module + action.
 *
 * @param module  - Tên module nghiệp vụ. Ví dụ: 'contracts', 'leads', 'employees'
 * @param action  - Hành động. Ví dụ: 'create', 'read', 'update', 'delete'
 * @returns boolean - true nếu được phép, false nếu không
 */
export function usePermission(module: string, action: string): boolean {
  const [allowed, setAllowed] = useState<boolean>(false);
  const { user } = useAuth();

  useEffect(() => {
    let isMounted = true;

    async function checkPermission() {
      try {
        if (!user) {
          if (isMounted) setAllowed(false);
          return;
        }

        // Lấy role từ bảng profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, company_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          if (isMounted) setAllowed(false);
          return;
        }

        // Admin roles luôn được phép
        if (ADMIN_ROLES.includes(profile.role)) {
          if (isMounted) setAllowed(true);
          return;
        }

        // Landlord role có quyền đọc các module bất động sản, hợp đồng, hóa đơn, báo cáo
        if (profile.role === 'landlord') {
          const allowedModules = ['buildings', 'rooms', 'contracts', 'invoices', 'services', 'reports'];
          const isReadAction = ['view', 'read', 'list'].includes(action);
          const hasAccess = allowedModules.includes(module) && isReadAction;
          if (isMounted) setAllowed(hasAccess);
          return;
        }

        if (!profile.company_id) {
          if (isMounted) setAllowed(false);
          return;
        }

        // Lấy thông tin vai trò từ bảng roles (matching name với profile.role)
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('id, permissions')
          .eq('company_id', profile.company_id)
          .eq('name', profile.role)
          .maybeSingle();

        if (roleError || !roleData) {
          if (isMounted) setAllowed(false);
          return;
        }

        // 1. Kiểm tra mảng permissions phẳng (dạng module.read / module.write / *)
        let mappedAction = action;
        if (['view', 'read', 'list'].includes(action)) {
          mappedAction = 'read';
        } else if (['create', 'add', 'edit', 'update', 'delete', 'remove', 'write'].includes(action)) {
          mappedAction = 'write';
        }

        const hasFlatPermission =
          roleData.permissions.includes('*') ||
          roleData.permissions.includes(`${module}.${mappedAction}`) ||
          roleData.permissions.includes(`${module}.*`);

        if (hasFlatPermission) {
          if (isMounted) setAllowed(true);
          return;
        }

        // 2. Kiểm tra join table role_permissions kết nối với permissions
        const dbActionMap: Record<string, string[]> = {
          read: ['view', 'manage'],
          view: ['view', 'manage'],
          create: ['create', 'manage'],
          add: ['create', 'manage'],
          edit: ['edit', 'manage'],
          update: ['edit', 'manage'],
          delete: ['delete', 'manage'],
          remove: ['delete', 'manage'],
          manage: ['manage'],
          write: ['create', 'edit', 'delete', 'manage'],
        };

        const possibleDbActions = dbActionMap[action] || [action, 'manage'];

        // Thực hiện join thông qua Supabase PostgREST
        const { data: rpData, error: rpError } = await supabase
          .from('role_permissions')
          .select('id, permissions!inner(module, action)')
          .eq('role_id', roleData.id)
          .eq('permissions.module', module)
          .in('permissions.action', possibleDbActions as any);

        if (!rpError && rpData && rpData.length > 0) {
          if (isMounted) setAllowed(true);
          return;
        }

        // Không tìm thấy quyền phù hợp
        if (isMounted) setAllowed(false);
      } catch (err) {
        console.error('Error in usePermission hook:', err);
        if (isMounted) setAllowed(false);
      }
    }

    checkPermission();

    return () => {
      isMounted = false;
    };
  }, [module, action]);

  return allowed;
}

