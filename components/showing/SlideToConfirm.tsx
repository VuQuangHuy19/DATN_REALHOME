'use client';

import React, { useState, useRef } from 'react';
import { ChevronRight, Check, Loader2 } from 'lucide-react';

interface SlideToConfirmProps {
  onConfirm: () => Promise<void> | void;
  label?: string;
  confirmedLabel?: string;
  disabled?: boolean;
}

export function SlideToConfirm({
  onConfirm,
  label = 'Vuốt để báo Đang di chuyển qua tòa',
  confirmedLabel = 'Đã phát tín hiệu di chuyển',
  disabled = false,
}: SlideToConfirmProps) {
  const [slidePosition, setSlidePosition] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (isConfirmed || disabled || loading || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offset = clientX - rect.left - 24; // 24px thumb width half
    const maxSlide = rect.width - 56; // 56px thumb width

    if (offset <= 0) {
      setSlidePosition(0);
    } else if (offset >= maxSlide) {
      setSlidePosition(maxSlide);
    } else {
      setSlidePosition(offset);
    }
  };

  const handleTouchEnd = async () => {
    if (isConfirmed || disabled || loading || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const maxSlide = rect.width - 56;

    if (slidePosition >= maxSlide * 0.8) {
      setSlidePosition(maxSlide);
      setLoading(true);
      try {
        await onConfirm();
        setIsConfirmed(true);
      } catch (err) {
        console.error('Slide confirm error:', err);
        setSlidePosition(0);
      } finally {
        setLoading(false);
      }
    } else {
      setSlidePosition(0);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={(e) => {
        if (e.buttons === 1) handleTouchMove(e);
      }}
      onMouseUp={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full h-12 rounded-full overflow-hidden flex items-center p-1 select-none transition-all ${
        isConfirmed
          ? 'bg-emerald-600 text-white'
          : disabled
          ? 'bg-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
          : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white cursor-pointer shadow-md'
      }`}
    >
      {/* Background Track Text */}
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold tracking-wide uppercase pointer-events-none px-12 text-center">
        {loading ? (
          <span className="flex items-center gap-1.5 text-white animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang gửi thông báo cho Chủ nhà...
          </span>
        ) : isConfirmed ? (
          <span className="flex items-center gap-1 text-white">
            <Check className="h-4 w-4 stroke-[3px]" /> {confirmedLabel}
          </span>
        ) : (
          <span className="opacity-90">{label}</span>
        )}
      </div>

      {/* Sliding Thumb Knob */}
      {!isConfirmed && (
        <div
          style={{ transform: `translateX(${slidePosition}px)` }}
          className="relative z-10 w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-lg transition-transform duration-75 active:scale-105"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          ) : (
            <ChevronRight className="h-6 w-6 stroke-[2.5px] animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
}
