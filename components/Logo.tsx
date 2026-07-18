'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useTenant } from './providers/TenantProvider';

interface LogoProps {
  className?: string;
  showSlogan?: boolean;
  align?: 'center' | 'start';
}

export function Logo({ className, showSlogan = false, align = 'center' }: LogoProps) {
  const { logo_url, name } = useTenant();

  if (logo_url) {
    return (
      <div className={cn(`flex flex-col justify-center select-none ${align === 'start' ? 'items-start' : 'items-center'}`, className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo_url} alt={name || 'Company Logo'} className="h-10 object-contain" />
        {showSlogan && (
          <span className="text-[0.65em] font-bold tracking-[0.25em] mt-1 text-slate-500 uppercase">
            {name || 'Giá trị thực'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn(`flex flex-col justify-center select-none ${align === 'start' ? 'items-start' : 'items-center'}`, className)}>
      <div className="flex items-center tracking-tighter">
        {/* Chữ Real: Sử dụng màu text-brand (màu tenant) thay vì text-slate-900 để tự động đổi màu */}
        <span className="font-black text-[1.5em] font-heading text-brand drop-shadow-sm">Real</span>
        {/* Chữ Home: Màu vàng ánh kim nổi bật, Nét dày */}
        <span className="font-black text-[1.5em] font-heading text-amber-500 drop-shadow-sm">Home</span>
        {/* Dấu chấm phá cách */}
        <span className="font-black text-[1.5em] text-amber-500 ml-[2px]">.</span>
      </div>
      {showSlogan && (
        <span className="text-[0.65em] font-bold tracking-[0.25em] mt-0.5 text-slate-500 uppercase">
          {name || 'Giá trị thực'}
        </span>
      )}
    </div>
  );
}
