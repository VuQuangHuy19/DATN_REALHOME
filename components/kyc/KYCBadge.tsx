import React from 'react';
import { ShieldCheck, UserCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface KYCBadgeProps {
  type?: 'landlord' | 'sale' | 'property';
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  systemName?: string | null;
  name?: string | null;
}

export default function KYCBadge({
  type = 'property',
  isVerified = false,
  size = 'md',
  showTooltip = true,
  systemName,
  name,
}: KYCBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm gap-2 font-bold',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const displayName = systemName?.trim() || name?.trim() || 'Chính chủ';

  // Unverified Orange Badge
  if (!isVerified) {
    const unverifiedText = (systemName?.trim() || name?.trim()) 
      ? `${systemName?.trim() || name?.trim()} (Chưa KYC)` 
      : 'Chưa KYC';

    return (
      <span
        title={showTooltip ? `${displayName} - Chưa hoàn tất xác thực KYC sinh trắc học` : undefined}
        className={`inline-flex items-center rounded-full font-bold bg-amber-500 text-white shadow-sm border border-amber-600/60 ${sizeClasses[size]}`}
      >
        <AlertCircle className={iconSizes[size]} />
        <span>{unverifiedText}</span>
      </span>
    );
  }

  // Verified Green Badges
  if (type === 'property') {
    return (
      <span
        title={showTooltip ? `${displayName} - Đã xác thực sinh trắc học KYC` : undefined}
        className={`inline-flex items-center rounded-full font-bold bg-emerald-600 text-white shadow-sm border border-emerald-700/60 ${sizeClasses[size]}`}
      >
        <ShieldCheck className={iconSizes[size]} />
        <span>{displayName} ✓ KYC</span>
      </span>
    );
  }

  if (type === 'landlord') {
    return (
      <span
        title={showTooltip ? `${displayName} - Đã hoàn thành đối chiếu CCCD và Giấy tờ pháp lý` : undefined}
        className={`inline-flex items-center rounded-full font-bold bg-emerald-600 text-white shadow-sm ${sizeClasses[size]}`}
      >
        <CheckCircle2 className={iconSizes[size]} />
        <span>{displayName} ✓ KYC</span>
      </span>
    );
  }

  // type === 'sale'
  return (
    <span
      title={showTooltip ? 'Nhân viên môi giới chính thức RealHome - Đã xác thực sinh trắc học 3D' : undefined}
      className={`inline-flex items-center rounded-full font-bold bg-purple-600 text-white shadow-sm ${sizeClasses[size]}`}
    >
      <UserCheck className={iconSizes[size]} />
      <span>Môi giới chính thức ✓ KYC</span>
    </span>
  );
}
