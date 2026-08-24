'use client';

import React from 'react';
import KYCForm from '@/components/kyc/KYCForm';
import KYCApprovalAdminPage from '@/app/admin/system/kyc-approval/page';
import { useAuth } from '@/lib/auth/AuthContext';
import { Loader2 } from 'lucide-react';

export default function KYCPage() {
  const { user, profile, company, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-blue-600" />
        <span className="text-sm font-medium">Đang tải thông tin...</span>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="text-rose-600 font-bold text-lg">Bạn chưa đăng nhập</div>
        <p className="text-sm text-slate-600">Vui lòng đăng nhập tài khoản để thực hiện chức năng KYC.</p>
      </div>
    );
  }

  // Đối với Ban quản trị / Quản lý -> Hiển thị Màn hình Xem danh sách & Phê duyệt KYC
  const isAdminRole = role === 'company_admin' || (role as any) === 'admin' || role === 'manager' || role === 'super_admin' || (role as any) === 'accountant';
  if (isAdminRole) {
    return <KYCApprovalAdminPage />;
  }

  // Đối với Chủ nhà hoặc Sale -> Hiển thị Form đăng ký xác thực KYC cá nhân
  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg">
        <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
          Xác thực KYC (Nguồn hàng sạch &amp; Sale chuẩn)
        </h1>
        <p className="mt-2 text-blue-100 text-sm max-w-2xl">
          Hoàn thành xác thực 3 ảnh sinh trắc học để nhận huy hiệu tích xanh uy tín. Chủ nhà được bảo chứng nguồn hàng sạch 100%, Sale được công nhận đại lý chính thức trên toàn hệ thống RealHome.
        </p>
      </div>

      <KYCForm
        userId={user.id}
        userRole={profile.role || 'sale'}
        landlordId={profile.landlord_id || undefined}
        companyId={company?.id || profile.company_id || undefined}
      />
    </div>
  );
}
