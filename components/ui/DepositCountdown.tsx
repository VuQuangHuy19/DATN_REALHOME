'use client';

import { useEffect, useState } from 'react';

export function DepositCountdown({ createdAt }: { createdAt: string }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const createdTime = new Date(createdAt).getTime();
      const limitTime = createdTime + 10 * 60 * 1000; // 10 minutes
      const now = new Date().getTime();
      const diff = limitTime - now;

      if (diff <= 0) {
        return 'Hết hạn';
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return `${minutes}p ${String(seconds).padStart(2, '0')}s`;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const next = calculateTimeLeft();
      setTimeLeft(next);
      if (next === 'Hết hạn') {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [createdAt]);

  if (timeLeft === 'Hết hạn') {
    return <span className="text-[11px] text-red-500 font-bold ml-1">⏱️ Hết hạn chuyển cọc</span>;
  }

  return (
    <span className="text-[11px] text-amber-600 font-bold ml-1 animate-pulse bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
      ⏱️ Cọc giữ chỗ: {timeLeft}
    </span>
  );
}
