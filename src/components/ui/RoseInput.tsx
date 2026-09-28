'use client';

import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const ROSE_PRESETS = [
  '50% - 12th',
  '40% - 6th, 60% - 12th',
  '30% - 6th, 50% - 12th',
  '1 tháng',
  '0.5 tháng',
  '50%',
  '40%',
  '30%',
  '20%',
];

interface RoseInputProps {
  id?: string;
  name?: string;
  defaultValue?: string;
  className?: string;
  inputClassName?: string;
}

export function RoseInput({ id, name, defaultValue = '', className = '', inputClassName = '' }: RoseInputProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const applyPreset = (preset: string) => {
    setValue(preset);
    if (inputRef.current) inputRef.current.focus();
  };

  const clear = () => {
    setValue('');
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Preset chips */}
      <div className="flex flex-wrap gap-1.5">
        {ROSE_PRESETS.map((preset) => {
          const isActive = value === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer leading-none ${
                isActive
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400'
              }`}
            >
              {preset}
            </button>
          );
        })}
      </div>

      {/* Text input */}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Hoặc nhập tự do, vd: 50% - 12th, 40% - 6th"
          className={`rounded-xl border-slate-200 focus:border-emerald-400 pr-8 text-xs ${inputClassName}`}
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {value && (
        <p className="text-[11px] text-slate-500 font-medium">
          Đã nhập: <span className="font-bold text-emerald-700">{value}</span>
        </p>
      )}
    </div>
  );
}
