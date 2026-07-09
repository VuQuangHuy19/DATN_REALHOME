import React, { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionGateProps {
  /** Tên module nghiệp vụ. Ví dụ: 'contracts', 'leads', 'employees' */
  module: string;
  /** Hành động cần kiểm tra. Ví dụ: 'create', 'read', 'update', 'delete' */
  action: string;
  /** Nội dung UI chỉ render khi user có đủ quyền */
  children: ReactNode;
  /** (Tuỳ chọn) Nội dung fallback khi không có quyền, mặc định là null */
  fallback?: ReactNode;
}

/**
 * Component wrapper kiểm soát hiển thị UI theo quyền của user.
 * Render children nếu user có quyền, ngược lại render fallback (mặc định null).
 */
export default function PermissionGate({
  module,
  action,
  children,
  fallback = null,
}: PermissionGateProps) {
  const allowed = usePermission(module, action);

  if (!allowed) return <>{fallback}</>;

  return <>{children}</>;
}

// ============================================================
// VÍ DỤ SỬ DỤNG
// ============================================================
//
// 1. Ẩn nút "Xóa hợp đồng" với sales_agent, chỉ hiện với admin:
//
//    import PermissionGate from '@/components/PermissionGate';
//
//    <PermissionGate module="contracts" action="delete">
//      <button onClick={() => handleDelete(contract.id)}>
//        Xóa hợp đồng
//      </button>
//    </PermissionGate>
//
// ------------------------------------------------------------
//
// 2. Ẩn nút "Liên hệ hỗ trợ 🔔 09xxxx" ở sidebar, chỉ hiện với company_admin:
//
//    <PermissionGate module="support" action="contact">
//      <button className="support-btn">
//        🔔 Liên hệ hỗ trợ 09xxxx
//      </button>
//    </PermissionGate>
//
// ------------------------------------------------------------
//
// 3. Hiển thị nội dung thay thế khi không có quyền (fallback):
//
//    <PermissionGate
//      module="employees"
//      action="delete"
//      fallback={<span className="text-gray-400 text-sm">Không có quyền xóa</span>}
//    >
//      <button onClick={() => handleDeleteEmployee(id)}>
//        Xóa nhân viên
//      </button>
//    </PermissionGate>
//
// ============================================================
