'use client';

import { useState, useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Loader2, Search } from 'lucide-react';
import Pagination from '@/components/Pagination';

export interface CrudTableProps {
  data: any[];
  columns: { key: string; label: string }[];
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  loading?: boolean;
  icon: React.ElementType;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  tabTitle?: string;
  type?: 'prices' | 'amenities' | 'roomtypes' | 'rules' | 'areas';
}

export function CrudTable({
  data,
  columns,
  onEdit,
  onDelete,
  onBulkDelete,
  loading,
  icon: Icon,
  searchTerm = '',
  onSearchChange,
  tabTitle,
  type,
}: CrudTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((item) => {
      return (
        item.label?.toLowerCase().includes(term) ||
        item.name?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.icon?.toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, data, type]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const startIdx = (safePage - 1) * pageSize;
    return filteredData.slice(startIdx, startIdx + pageSize);
  }, [filteredData, safePage, pageSize]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm font-medium text-ink-muted">Đang tải dữ liệu danh mục...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-14 border border-dashed border-border rounded-xl bg-bg-base/40">
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3 text-accent">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="font-semibold text-ink text-base">Chưa có dữ liệu danh mục</h3>
        <p className="text-sm text-ink-muted mt-1 max-w-sm mx-auto">
          Nhấn nút &quot;Thêm mới&quot; để thiết lập mục đầu tiên cho hệ thống của bạn.
        </p>
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-border rounded-xl bg-bg-base/30">
        <Search className="h-7 w-7 mx-auto mb-2 text-ink-muted opacity-40" />
        <p className="text-sm text-ink-muted font-medium">
          Không tìm thấy mục phù hợp với từ khóa &quot;{searchTerm}&quot;
        </p>
      </div>
    );
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedData.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete) return;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa ${selectedIds.length} mục đã chọn không? Thao tác này không thể hoàn tác.`
      )
    )
      return;
    try {
      await onBulkDelete(selectedIds);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Toolbar with Title, Search shifted to middle/left-center, and Pagination on top right */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border/60">
        {/* Left: Icon + Title + Count Info */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-bold text-sm">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-base text-ink">
              Danh sách {tabTitle || 'danh mục'}
            </h2>
            <p className="text-xs text-ink-muted font-medium">
              Hiển thị <strong>{filteredData.length > 0 ? (safePage - 1) * pageSize + 1 : 0} - {Math.min(safePage * pageSize, filteredData.length)}</strong> trong tổng số <strong>{filteredData.length}</strong> mục
            </p>
          </div>
        </div>

        {/* Middle / Center-Left: Search Input */}
        {onSearchChange && (
          <div className="relative w-full md:w-64 lg:w-72 md:mr-auto md:ml-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <Input
              placeholder={`Tìm ${tabTitle ? tabTitle.toLowerCase() : 'danh mục'}...`}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 rounded-xl h-9 border-border bg-bg-base/30 focus:bg-white text-xs"
            />
          </div>
        )}

        {/* Far Right: Pagination Buttons */}
        {totalPages > 1 && (
          <div className="shrink-0 self-end md:self-auto">
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        )}
      </div>

      {selectedIds.length > 0 && onBulkDelete && (
        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg animate-in fade-in">
          <span className="text-xs font-semibold text-red-700 dark:text-red-400">
            Đã chọn {selectedIds.length} trên tổng số {filteredData.length} mục
          </span>
          <Button
            onClick={handleBulkDelete}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white rounded-lg whitespace-nowrap h-8 text-xs font-semibold"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Xóa hàng loạt
          </Button>
        </div>
      )}

      <div className="border border-border rounded-xl overflow-hidden bg-white shadow-xs">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-bg-subtle/80 border-b border-border">
            <tr>
              {onBulkDelete && (
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    className="rounded border-border text-accent focus:ring-accent h-4 w-4 cursor-pointer"
                    onChange={handleSelectAll}
                    checked={
                      selectedIds.length > 0 &&
                      selectedIds.length === filteredData.length
                    }
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-5 py-3.5 text-left text-xs font-bold text-ink-muted uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
              <th className="px-5 py-3.5 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-ink">
            {paginatedData.map((item) => (
              <tr
                key={item.id}
                onClick={() => onEdit(item)}
                className="cursor-pointer hover:bg-accent/5 transition-all group"
                title="Bấm để xem và chỉnh sửa thông tin"
              >
                {onBulkDelete && (
                  <td
                    className="px-4 py-3.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-border text-accent focus:ring-accent h-4 w-4 cursor-pointer"
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => handleSelect(item.id, e.target.checked)}
                    />
                  </td>
                )}

                {/* Customized cell values */}
                {type === 'prices' ? (
                  <>
                    <td className="px-5 py-3.5 font-bold text-ink text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                          ₫
                        </div>
                        <span>{item.label}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-200 font-mono">
                        {item.min !== null && item.min !== undefined
                          ? `${Number(item.min).toLocaleString('vi-VN')} đ`
                          : '0 đ'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-200 font-mono">
                        {item.max !== null && item.max !== undefined
                          ? `${Number(item.max).toLocaleString('vi-VN')} đ`
                          : 'Không giới hạn'}
                      </Badge>
                    </td>
                  </>
                ) : type === 'amenities' ? (
                  <>
                    <td className="px-5 py-3.5 font-semibold text-ink text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-lg shadow-2xs">
                          {item.icon || '✨'}
                        </div>
                        <span className="font-bold">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <code className="text-xs px-2 py-1 bg-bg-subtle border border-border rounded font-mono text-ink-muted">
                        {item.icon || 'Mặc định'}
                      </code>
                    </td>
                  </>
                ) : type === 'rules' ? (
                  <>
                    <td className="px-5 py-3.5 font-semibold text-ink text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 border border-violet-200 flex items-center justify-center text-lg shadow-2xs">
                          {item.icon || '📜'}
                        </div>
                        <span className="font-bold text-slate-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className={`font-semibold text-xs ${
                        (item.description || 'Quy định chung') === 'Quy định cho phòng'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-violet-50 text-violet-700 border-violet-200'
                      }`}>
                        {item.description || 'Quy định chung'}
                      </Badge>
                    </td>
                  </>
                ) : type === 'areas' ? (
                  <>
                    <td className="px-5 py-3.5 font-semibold text-ink text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-lg shadow-2xs">
                          {item.icon || '📍'}
                        </div>
                        <span className="font-bold text-slate-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className={`font-semibold text-xs ${
                        (item.description || item.name).toLowerCase().includes('giáp ranh')
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {item.description || (item.name.toLowerCase().includes('giáp ranh') ? 'Vùng giáp ranh' : 'Khu vực chính')}
                      </Badge>
                    </td>
                  </>
                ) : type === 'roomtypes' ? (
                  <>
                    <td className="px-5 py-3.5 font-bold text-ink text-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center text-lg shadow-2xs font-bold">
                          {item.icon || '🏢'}
                        </div>
                        <Badge className="bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 px-2.5 py-1 text-xs font-bold">
                          {item.name}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-muted">
                      {item.description || 'Chưa có mô tả'}
                    </td>
                  </>
                ) : (
                  columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-5 py-3.5 text-sm font-medium text-ink"
                    >
                      {item[col.key] ?? '—'}
                    </td>
                  ))
                )}

                <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-ink-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(item);
                      }}
                      title="Chỉnh sửa"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            'Bạn có chắc muốn xóa mục này? Thao tác này không thể hoàn tác.'
                          )
                        ) {
                          onDelete(item.id);
                        }
                      }}
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
