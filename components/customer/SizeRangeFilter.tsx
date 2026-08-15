'use client';

import React, { useState, useEffect } from 'react';
import type { CustomerListing } from '@/lib/customer/types';
import {
  useSmartSizeBrackets,
  type SizeBracket,
} from '@/src/hooks/useSmartSizeBrackets';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SizeRangeItem {
  min: number;      // 0 = không giới hạn dưới
  max: number;      // Infinity = không giới hạn trên
}

export interface MultiSizeValue {
  selectedKeys: string[];       // Danh sách các bracket key được chọn
  manual: SizeRangeItem | null; // Khoảng nhập tay
}

interface SizeRangeFilterProps {
  listings: CustomerListing[];
  /** null = "Tất cả" */
  value: MultiSizeValue | null;
  onChange: (value: MultiSizeValue | null) => void;
  showManualInput?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SizeRangeFilter({
  listings,
  value,
  onChange,
  showManualInput = true,
}: SizeRangeFilterProps) {
  const brackets = useSmartSizeBrackets(listings);

  const selectedKeys = value?.selectedKeys || [];
  const manual = value?.manual || null;

  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput]     = useState('');
  const [inputError, setInputError] = useState('');

  useEffect(() => {
    if (manual) {
      setFromInput(manual.min > 0 ? String(manual.min) : '');
      setToInput(manual.max < Infinity ? String(manual.max) : '');
    } else {
      setFromInput('');
      setToInput('');
    }
  }, [manual]);

  const handleBracketToggle = (bracketKey: string) => {
    setInputError('');
    let nextKeys: string[];
    if (selectedKeys.includes(bracketKey)) {
      nextKeys = selectedKeys.filter(k => k !== bracketKey);
    } else {
      nextKeys = [...selectedKeys, bracketKey];
    }

    if (nextKeys.length === 0 && !manual) {
      onChange(null);
    } else {
      onChange({ selectedKeys: nextKeys, manual });
    }
  };

  const handleManualApply = () => {
    const min = fromInput.trim() ? parseFloat(fromInput) : 0;
    const max = toInput.trim() ? parseFloat(toInput) : Infinity;

    if (isNaN(min) || isNaN(max)) {
      setInputError('Diện tích không hợp lệ');
      return;
    }
    if (max !== Infinity && min > max) {
      setInputError('Diện tích "Từ" phải nhỏ hơn "Đến"');
      return;
    }

    const nextManual = (min === 0 && max === Infinity) ? null : { min, max };
    if (selectedKeys.length === 0 && !nextManual) {
      onChange(null);
    } else {
      onChange({ selectedKeys, manual: nextManual });
    }
    setInputError('');
  };

  const handleClear = () => {
    setFromInput('');
    setToInput('');
    setInputError('');
    onChange(null);
  };

  const isAllActive = selectedKeys.length === 0 && !manual;

  return (
    <div className="space-y-3">
      {/* ── Pill Buttons (Multi-Select) ── */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={handleClear}
          className={[
            'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer',
            isAllActive
              ? 'bg-accent text-white border-accent shadow-sm'
              : 'bg-card border-border-subtle text-ink-muted hover:border-accent/60 hover:text-ink',
          ].join(' ')}
        >
          Tất cả
        </button>

        {brackets.map((bracket) => {
          const active = selectedKeys.includes(bracket.key);
          return (
            <button
              key={bracket.key}
              type="button"
              onClick={() => handleBracketToggle(bracket.key)}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer',
                active
                  ? 'bg-accent text-white border-accent shadow-sm'
                  : 'bg-card border-border-subtle text-ink-muted hover:border-accent/60 hover:text-ink',
              ].join(' ')}
              title={`${bracket.count} phòng trong khoảng diện tích này`}
            >
              {bracket.label}
              {bracket.count > 0 && (
                <span
                  className={[
                    'ml-1.5 font-mono font-bold text-[10px]',
                    active ? 'text-white/80' : 'text-accent/70',
                  ].join(' ')}
                >
                  ({bracket.count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Ô nhập tay ── */}
      {showManualInput && (
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <input
              type="number"
              min={0}
              step={1}
              placeholder="Từ (m²)"
              value={fromInput}
              onChange={(e) => { setFromInput(e.target.value); setInputError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleManualApply()}
              className="w-full h-8 px-2.5 pr-8 rounded-lg border border-border-subtle bg-card text-xs text-ink font-medium placeholder:text-ink-muted/60 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-ink-muted font-medium pointer-events-none">m²</span>
          </div>

          <span className="text-ink-muted text-xs font-bold shrink-0">—</span>

          <div className="relative flex-1">
            <input
              type="number"
              min={0}
              step={1}
              placeholder="Đến (m²)"
              value={toInput}
              onChange={(e) => { setToInput(e.target.value); setInputError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleManualApply()}
              className="w-full h-8 px-2.5 pr-8 rounded-lg border border-border-subtle bg-card text-xs text-ink font-medium placeholder:text-ink-muted/60 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-ink-muted font-medium pointer-events-none">m²</span>
          </div>

          <button
            type="button"
            onClick={handleManualApply}
            className="h-8 px-3 rounded-lg bg-accent text-white text-xs font-bold shrink-0 hover:bg-accent/90 transition-all active:scale-95 cursor-pointer"
          >
            Áp dụng
          </button>
        </div>
      )}

      {inputError && (
        <p className="text-[11px] text-red-500 font-medium mt-1">{inputError}</p>
      )}
    </div>
  );
}

export default SizeRangeFilter;
