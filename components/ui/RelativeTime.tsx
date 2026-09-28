'use client';

import { useState, useEffect } from 'react';
import { formatRelativeTime } from '@/lib/utils/relative-time';

interface RelativeTimeProps {
  date: string | null | undefined;
  className?: string;
  prefix?: string;
}

export function RelativeTime({ date, className = '', prefix = '' }: RelativeTimeProps) {
  const [text, setText] = useState<string | null>(() => formatRelativeTime(date));

  useEffect(() => {
    setText(formatRelativeTime(date));
    if (!date) return;

    // Cập nhật chuỗi thời gian tương đối mỗi 60 giây (1 phút)
    const interval = setInterval(() => {
      setText(formatRelativeTime(date));
    }, 60_000);

    return () => clearInterval(interval);
  }, [date]);

  if (!text) return null;

  return (
    <span className={className}>
      {prefix}{text}
    </span>
  );
}
