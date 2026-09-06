'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Tính toán dãy số trang hiển thị (hỗ trợ dấu rút gọn ... nếu quá nhiều trang)
  const getPages = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const pages = getPages();

  return (
    <nav className="flex items-center gap-1.5 select-none" aria-label="Pagination">
      {/* Trang trước */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="inline-flex items-center justify-center gap-1 h-9 px-3 rounded-xl border border-border bg-white dark:bg-zinc-800 text-xs font-semibold text-ink-muted hover:text-ink hover:border-accent disabled:opacity-40 disabled:hover:border-border disabled:hover:text-ink-muted transition-all cursor-pointer shadow-2xs"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Trước</span>
      </button>

      {/* Danh sách trang */}
      <div className="flex items-center gap-1 font-sans">
        {pages.map((page, idx) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="h-9 px-2 flex items-center justify-center text-xs font-bold text-ink-muted"
              >
                ...
              </span>
            );
          }

          const pageNum = page as number;
          const isCurrent = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`h-9 min-w-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center shadow-2xs ${
                isCurrent
                  ? 'bg-accent text-white font-extrabold shadow-xs'
                  : 'bg-white dark:bg-zinc-800 border border-border text-ink hover:border-accent hover:text-accent'
              }`}
              aria-current={isCurrent ? 'page' : undefined}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      {/* Trang sau */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="inline-flex items-center justify-center gap-1 h-9 px-3 rounded-xl border border-border bg-white dark:bg-zinc-800 text-xs font-semibold text-ink-muted hover:text-ink hover:border-accent disabled:opacity-40 disabled:hover:border-border disabled:hover:text-ink-muted transition-all cursor-pointer shadow-2xs"
      >
        <span className="hidden sm:inline">Sau</span>
        <ChevronRight className="h-4 w-4 shrink-0" />
      </button>
    </nav>
  );
}
