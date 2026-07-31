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
    <nav className="flex items-center justify-between border-t border-border-subtle px-4 sm:px-0 mt-6 pt-6 select-none">
      {/* Trang trước */}
      <div className="-mt-px flex w-0 flex-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex items-center border-t-2 border-transparent pr-1 pt-4 text-sm font-medium text-ink-muted hover:border-border-subtle hover:text-ink disabled:opacity-40 disabled:hover:border-transparent disabled:hover:text-ink-muted transition-colors"
        >
          <ChevronLeft className="mr-2 h-4 w-4 text-ink-muted" aria-hidden="true" />
          Trước
        </button>
      </div>

      {/* Danh sách trang - Hiển thị trên cả Mobile và Desktop */}
      <div className="-mt-px flex items-center justify-center gap-1 sm:gap-1.5 font-sans overflow-x-auto max-w-[220px] sm:max-w-none px-1 scrollbar-none">
        {pages.map((page, idx) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="inline-flex items-center border-t-2 border-transparent px-2 sm:px-3 pt-4 text-xs sm:text-sm font-medium text-ink-muted"
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
              className={`inline-flex items-center border-t-2 px-2.5 sm:px-4 pt-4 text-xs sm:text-sm font-extrabold transition-colors ${
                isCurrent
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black'
                  : 'border-transparent text-ink-muted hover:border-border-subtle hover:text-ink'
              }`}
              aria-current={isCurrent ? 'page' : undefined}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      {/* Trang sau */}
      <div className="-mt-px flex w-0 flex-1 justify-end">
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="inline-flex items-center border-t-2 border-transparent pl-1 pt-4 text-sm font-medium text-ink-muted hover:border-border-subtle hover:text-ink disabled:opacity-40 disabled:hover:border-transparent disabled:hover:text-ink-muted transition-colors"
        >
          Sau
          <ChevronRight className="ml-2 h-4 w-4 text-ink-muted" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
