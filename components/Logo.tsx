import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showSlogan?: boolean;
  align?: 'center' | 'start';
}

export function Logo({ className, showSlogan = false, align = 'center' }: LogoProps) {
  return (
    <div className={cn(`flex flex-col justify-center select-none ${align === 'start' ? 'items-start' : 'items-center'}`, className)}>
      <div className="flex items-baseline tracking-tight">
        <span className="font-extrabold text-[1.4em] font-heading text-blue-900">Real</span>
        <span className="font-medium text-[1.4em] font-heading text-blue-900">Home</span>
      </div>
      {showSlogan && (
        <span className="text-[0.65em] uppercase font-bold tracking-[0.2em] mt-0.5 text-slate-500">
          Giá trị thực
        </span>
      )}
    </div>
  );
}
