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
      <div className="flex items-center tracking-tighter">
        {/* Chữ Real: Xanh Navy sang trọng, Nét dày vững chãi */}
        <span className="font-black text-[1.5em] font-heading text-slate-900 drop-shadow-sm">Real</span>
        {/* Chữ Home: Màu đỏ nổi bật, Nét dày */}
        <span className="font-black text-[1.5em] font-heading text-red-600 drop-shadow-sm">Home</span>
        {/* Dấu chấm phá cách (tùy chọn để tạo điểm nhấn hiện đại) */}
        <span className="font-black text-[1.5em] text-red-600 ml-[2px]">.</span>
      </div>
      {showSlogan && (
        <span className="text-[0.65em] font-bold tracking-[0.25em] mt-0.5 text-slate-500 uppercase">
          Giá trị thực
        </span>
      )}
    </div>
  );
}
