'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AtSign } from 'lucide-react';

// ─── Tất cả các tác nhân/vai trò có thể mention trong hệ thống ─────────────
export const MENTION_ACTORS = [
  { id: 'BQL', label: 'Ban Quản Lý', role: 'management', color: 'bg-amber-100 text-amber-950 border-amber-400 font-extrabold' },
  { id: 'KyThuat', label: 'Đội Kỹ Thuật', role: 'technical', color: 'bg-blue-100 text-blue-950 border-blue-400 font-extrabold' },
  { id: 'KeToan', label: 'Kế Toán', role: 'accounting', color: 'bg-emerald-100 text-emerald-950 border-emerald-400 font-extrabold' },
  { id: 'ChuNha', label: 'Chủ Nhà', role: 'landlord', color: 'bg-purple-100 text-purple-950 border-purple-400 font-extrabold' },
  { id: 'Admin', label: 'Quản Trị Viên', role: 'admin', color: 'bg-red-100 text-red-950 border-red-400 font-extrabold' },
  { id: 'NhanVien', label: 'Nhân Viên', role: 'staff', color: 'bg-cyan-100 text-cyan-950 border-cyan-400 font-extrabold' },
  { id: 'KhachThue', label: 'Khách Thuê', role: 'tenant', color: 'bg-orange-100 text-orange-950 border-orange-400 font-extrabold' },
  { id: 'BaoVe', label: 'Bảo Vệ', role: 'security', color: 'bg-gray-200 text-gray-950 border-gray-400 font-extrabold' },
] as const;

export type MentionActor = typeof MENTION_ACTORS[number];

// ─── Component: Mention Highlight Chip ──────────────────────────────────────
// Render chuỗi text chứa @mention thành các Chip nổi bật
export function MentionHighlightText({ text, className }: { text: string; className?: string }) {
  // Regex match @ActorId hoặc @CanHoXXX hoặc @TenKhachThuê bất kỳ
  const mentionRegex = /@(\w+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Text trước mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const mentionId = match[1];
    const actor = MENTION_ACTORS.find((a) => a.id.toLowerCase() === mentionId.toLowerCase());

    parts.push(
      <span
        key={`${match.index}-${mentionId}`}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border',
          actor ? actor.color : 'bg-amber-100 text-amber-900 border-amber-300'
        )}
      >
        <AtSign className="h-3 w-3" />
        {actor ? actor.label : mentionId}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}

// ─── Component: Mention Input (Textarea với autocomplete gợi ý mention) ────
interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function MentionInput({ value, onChange, placeholder, className, rows = 3 }: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredActors = MENTION_ACTORS.filter((actor) =>
    actor.id.toLowerCase().includes(suggestionFilter.toLowerCase()) ||
    actor.label.toLowerCase().includes(suggestionFilter.toLowerCase())
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const pos = e.target.selectionStart || 0;
    setCursorPosition(pos);
    onChange(newValue);

    // Debounce 300ms để kiểm tra mention trigger
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Tìm ký tự @ gần nhất trước cursor
      const textBeforeCursor = newValue.slice(0, pos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtIndex >= 0) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        // Chỉ show suggestions nếu không có khoảng trắng sau @
        if (!/\s/.test(textAfterAt)) {
          setSuggestionFilter(textAfterAt);
          setShowSuggestions(true);
          return;
        }
      }
      setShowSuggestions(false);
    }, 300);
  }, [onChange]);

  const insertMention = useCallback((actor: MentionActor) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = value.slice(cursorPosition);
    
    const newValue = value.slice(0, lastAtIndex) + `@${actor.id} ` + textAfterCursor;
    onChange(newValue);
    setShowSuggestions(false);

    // Focus lại textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = lastAtIndex + actor.id.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [value, cursorPosition, onChange]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder || 'Nhập nội dung... Gõ @ để gắn thẻ bộ phận'}
        rows={rows}
        className={cn(
          'w-full rounded-xl border border-border-subtle bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none transition-all',
          className
        )}
      />

      {/* Mention Suggestions Dropdown */}
      {showSuggestions && filteredActors.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-border-subtle rounded-xl shadow-xl max-h-52 overflow-y-auto animate-fade-in">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-border-subtle">
            Gắn thẻ bộ phận / tác nhân
          </div>
          {filteredActors.map((actor) => (
            <button
              key={actor.id}
              onClick={() => insertMention(actor)}
              className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors text-left"
            >
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border',
                actor.color
              )}>
                <AtSign className="h-3 w-3" />
                {actor.id}
              </span>
              <span className="text-sm text-ink font-medium">{actor.label}</span>
              <Badge variant="outline" className="ml-auto text-[10px]">{actor.role}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
