export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Quản trị viên hệ thống (Super Admin)',
  company_admin: 'Giám đốc / Admin công ty',
  admin: 'Quản trị viên',
  manager: 'Quản lý vận hành tòa nhà',
  sales_agent: 'Chuyên viên tư vấn / Môi giới (Sales)',
  landlord: 'Chủ bất động sản / Chủ nhà',
  tenant: 'Khách thuê phòng',
  customer: 'Khách hàng tìm phòng',
  accountant: 'Kế toán viên',
  employee: 'Nhân viên',
  // Format biến thể chữ hoa / chữ thường
  'Super Admin': 'Quản trị viên hệ thống (Super Admin)',
  'Company Admin': 'Giám đốc / Admin công ty',
  'Sales Agent': 'Chuyên viên tư vấn / Môi giới (Sales)',
  'Manager': 'Quản lý vận hành tòa nhà',
  'Landlord': 'Chủ bất động sản / Chủ nhà',
  'Tenant': 'Khách thuê phòng',
  'Customer': 'Khách hàng tìm phòng',
  'Accountant': 'Kế toán viên',
  'Employee': 'Nhân viên',
};

/**
 * Hàm chuyển đổi mã chức vụ / vai trò sang tên tiếng Việt thân thiện với người dùng
 */
export function getRoleLabel(roleKey: string | null | undefined): string {
  if (!roleKey) return '—';
  const cleanKey = roleKey.trim();
  if (ROLE_LABELS[cleanKey]) {
    return ROLE_LABELS[cleanKey];
  }
  const lowerKey = cleanKey.toLowerCase();
  if (ROLE_LABELS[lowerKey]) {
    return ROLE_LABELS[lowerKey];
  }
  return cleanKey;
}
