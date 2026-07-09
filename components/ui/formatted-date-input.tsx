'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Input } from './input';
import { Calendar } from 'lucide-react';

interface FormattedDateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  required?: boolean;
}

export function FormattedDateInput({
  value,
  onChange,
  name,
  id,
  required,
  placeholder = 'DD/MM/YYYY',
  className,
  ...props
}: FormattedDateInputProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Chuyển đổi YYYY-MM-DD -> DD/MM/YYYY
  const toDisplay = (val: string) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return val;
  };

  const [inputValue, setInputValue] = useState(toDisplay(value));

  useEffect(() => {
    setInputValue(toDisplay(value));
  }, [value]);

  const handleDisplayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Chỉ cho phép số và dấu gạch chéo
    const clean = val.replace(/[^0-9/]/g, '');

    // Tự động chèn dấu gạch chéo: ví dụ 16042004 -> 16/04/2004
    let formatted = clean;
    if (clean.length > 2 && clean[2] !== '/') {
      formatted = clean.slice(0, 2) + '/' + clean.slice(2);
    }
    if (formatted.length > 5 && formatted[5] !== '/') {
      formatted = formatted.slice(0, 5) + '/' + formatted.slice(5);
    }
    formatted = formatted.slice(0, 10);

    setInputValue(formatted);

    // Nếu đầy đủ 10 ký tự DD/MM/YYYY, chuyển đổi và kích hoạt onChange của cha dưới dạng YYYY-MM-DD
    if (formatted.length === 10) {
      const parts = formatted.split('/');
      if (parts.length === 3) {
        const dbVal = `${parts[2]}-${parts[1]}-${parts[0]}`;
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        // Kiểm tra tính hợp lệ cơ bản
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1000) {
          onChange(dbVal);
        }
      }
    } else if (formatted === '') {
      onChange('');
    }
  };

  const triggerDatePicker = () => {
    if (dateInputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          dateInputRef.current.showPicker();
        } catch (err) {
          dateInputRef.current.click();
        }
      } else {
        dateInputRef.current.click();
      }
    }
  };

  return (
    <div className="relative w-full">
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleDisplayChange}
        maxLength={10}
        className={className}
        {...props}
      />
      <div 
        onClick={triggerDatePicker}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer text-slate-400 hover:text-slate-600 z-10"
      >
        <Calendar className="h-4 w-4" />
      </div>
      <input
        type="date"
        ref={dateInputRef}
        value={value || ''}
        name={name}
        id={id}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 opacity-0 pointer-events-none"
      />
    </div>
  );
}
