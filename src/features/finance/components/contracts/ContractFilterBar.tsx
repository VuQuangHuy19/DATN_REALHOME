'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ContractFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
}

export function ContractFilterBar({
  searchQuery,
  onSearchChange,
  placeholder = 'Tìm hợp đồng theo tên khách, SĐT, mã hợp đồng hoặc mã phòng...',
}: ContractFilterBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
      <Input
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-9 rounded-lg border-border focus-visible:ring-accent"
      />
    </div>
  );
}
