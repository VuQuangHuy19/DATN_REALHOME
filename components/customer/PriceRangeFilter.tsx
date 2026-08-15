'use client';

import React, { useState, useEffect } from 'react';
import type { CustomerListing } from '@/lib/customer/types';
import {
  useSmartPriceBrackets,
  type PriceBracket,
} from '@/src/hooks/useSmartPriceBrackets';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PriceRangeItem {
  min: number;      // 0 = không giới hạn dưới
  max: number;      // Infinity = không giới hạn trên
}

export interface MultiPriceValue {
  selectedKeys: string[];        // Danh sách các bracket key được chọn
  manual: PriceRangeItem | null; // Khoảng nhập tay
}

interface PriceRangeFilterProps {
  listings: CustomerListing[];
  /** null = "Tất cả" (chưa lọc) */
  value: MultiPriceValue | null;
  onChange: (value: MultiPriceValue | null) => void;
  /** Hiển thị ô nhập tay hay không (default: true) */
  showManualInput?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseMillionInput(raw: string): number {
  const n = parseFloat(raw.replace(',', '.'));
  if (isNaN(n) || n <= 0) return 0;
  return Math.round(n * 1_000_000);
}

function formatMillionDisplay(vnd: number): string {
  if (!vnd || vnd <= 0) return '';
  const m = vnd / 1_000_000;
  return Number.isInteger(m) ? String(m) : m.toFixed(1).replace('.', ',');
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PriceRangeFilter({
  listings,
  value,
  onChange,
  showManualInput = true,
}: PriceRangeFilterProps) {
  const brackets = useSmartPriceBrackets(listings);

  const selectedKeys = value?.selectedKeys || [];
  const manual = value?.manual || null;

  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput]     = useState('');
  const [inputError, setInputError] = useState('');

  // Đồng bộ manual range lên input khi có
  useEffect(() => {
    if (manual) {
      setFromInput(manual.min > 0 ? formatMillionDisplay(manual.min) : '');
      setToInput(manual.max < Infinity ? formatMillionDisplay(manual.max) : '');
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
    const min = parseMillionInput(fromInput);
    const max = toInput.trim() ? parseMillionInput(toInput) : Infinity;

    if (max !== Infinity && min > max) {
      setInputError('Giá "Từ" phải nhỏ hơn "Đến"');
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
        {/* Nút "Tất cả" */}
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
              title={`${bracket.count} phòng trong khoảng giá này`}
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
              step={0.5}
              placeholder="Từ (tr)"
              value={fromInput}
              onChange={(e) => { setFromInput(e.target.value); setInputError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleManualApply()}
              className="w-full h-8 px-2.5 pr-7 rounded-lg border border-border-subtle bg-card text-xs text-ink font-medium placeholder:text-ink-muted/60 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-ink-muted font-medium pointer-events-none">tr</span>
          </div>

          <span className="text-ink-muted text-xs font-bold shrink-0">—</span>

          <div className="relative flex-1">
            <input
              type="number"
              min={0}
              step={0.5}
              placeholder="Đến (tr)"
              value={toInput}
              onChange={(e) => { setToInput(e.target.value); setInputError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleManualApply()}
              className="w-full h-8 px-2.5 pr-7 rounded-lg border border-border-subtle bg-card text-xs text-ink font-medium placeholder:text-ink-muted/60 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-ink-muted font-medium pointer-events-none">tr</span>
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

      {/* Error */}
      {inputError && (
        <p className="text-[11px] text-red-500 font-medium mt-1">{inputError}</p>
      )}
    </div>
  );
}

export default PriceRangeFilter;
