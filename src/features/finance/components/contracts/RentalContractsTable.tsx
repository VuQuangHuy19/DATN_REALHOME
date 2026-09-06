import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Pencil, Trash2, Search, FileText, Loader2,
  Printer, RefreshCw, ClipboardCheck, Eye, MoreHorizontal, Percent
} from 'lucide-react';
import { getContractTermMonths, calculateCommissionAmount } from '@/features/finance/services/commission';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Pagination from '@/components/Pagination';

interface RentalContractsTableProps {
  filteredRentals: any[];
  rentalsLoading: boolean;
  rentalSearch: string;
  setRentalSearch: (val: string) => void;
  profilesMap: Map<string, any>;
  role: string | null;
  pathPrefix: string;
  formatDateDisplay: (dateStr: string | null | undefined) => string;
  removeRental: (id: string) => void;
  setViewRental: (item: any) => void;
  setIsViewRentalOpen: (open: boolean) => void;
  setHandoverContract: (item: any) => void;
  setHandoverSourceType: (type: 'deposit' | 'rental') => void;
  setIsHandoverOpen: (open: boolean) => void;
  onOpenCommissionModal?: (type: 'deposit' | 'rental', contract: any) => void;
}

export function RentalContractsTable({
  filteredRentals,
  rentalsLoading,
  rentalSearch,
  setRentalSearch,
  profilesMap,
  role,
  pathPrefix,
  formatDateDisplay,
  removeRental,
  setViewRental,
  setIsViewRentalOpen,
  setHandoverContract,
  setHandoverSourceType,
  setIsHandoverOpen,
  onOpenCommissionModal,
}: RentalContractsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [rentalSearch]);

  const totalPages = Math.ceil(filteredRentals.length / pageSize);
  const safePage = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));
  const paginatedRentals = filteredRentals.slice((safePage - 1) * pageSize, safePage * pageSize);

  const rentalStatusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Bản nháp', color: 'bg-bg-subtle text-ink-muted border-border' },
    active: { label: 'Hiệu lực', color: 'bg-green-50 text-green-700 border-green-250' },
    ended: { label: 'Đã hết hạn', color: 'bg-bg-subtle text-ink-muted border-border' },
    terminated: { label: 'Kết thúc sớm', color: 'bg-amber-50 text-amber-700 border-amber-250' },
    cancelled: { label: 'Đã hủy', color: 'bg-red-50 text-red-750 border-red-250' },
  };

  return (
    <Card className="border-border shadow-none rounded-lg bg-white overflow-hidden">
      <CardHeader className="p-4 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <Input 
                placeholder="Tìm hợp đồng thuê theo tên khách, SĐT, mã hợp đồng hoặc mã phòng..." 
                value={rentalSearch} 
                onChange={(e) => setRentalSearch(e.target.value)} 
                className="pl-9 rounded-lg border-border focus-visible:ring-accent text-xs" 
              />
            </div>
            <div className="text-xs text-ink-muted font-medium hidden sm:block whitespace-nowrap">
              Hiển thị <strong>{filteredRentals.length > 0 ? (safePage - 1) * pageSize + 1 : 0} - {Math.min(safePage * pageSize, filteredRentals.length)}</strong> / <strong>{filteredRentals.length}</strong> hợp đồng thuê
            </div>
          </div>

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
      </CardHeader>
      <CardContent className="p-0">
        {rentalsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : (
          <>
            {/* Mobile Card List Hợp Đồng Thuê (Hiện trên mobile < md) */}
            <div className="block md:hidden space-y-3 p-3 bg-slate-50/50">
              {paginatedRentals.map((item) => {
                const statusInfo = rentalStatusLabels[item.status] || { label: item.status, color: 'bg-bg-subtle text-ink-muted' };
                const agentId = item.sales_agent_id || item.created_by;
                const saleProfile = agentId ? profilesMap.get(agentId) : null;

                return (
                  <div 
                    key={item.id} 
                    className="p-3.5 border border-slate-200 rounded-xl bg-white shadow-xs space-y-2.5 cursor-pointer active:bg-slate-50 transition-colors"
                    onClick={() => {
                      setViewRental(item);
                      setIsViewRentalOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {item.contract_code}
                      </span>
                      <Badge className={`${statusInfo.color} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant="outline">
                        {statusInfo.label}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between items-start">
                        <span className="text-slate-400 shrink-0">Phòng / Tòa:</span>
                        <div className="text-right">
                          <span className="font-bold text-accent block">Phòng {item.rooms?.code || '---'}</span>
                          <span className="text-[11px] text-slate-500 font-medium">{item.rooms?.buildings?.name || 'Vị trí khác'}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Khách thuê (Bên B):</span>
                        <span className="font-semibold text-slate-900">{item.party_b_name} • <span className="font-mono">{item.party_b_phone}</span></span>
                      </div>

                      {saleProfile && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Sale phụ trách:</span>
                          <span className="font-medium text-slate-800">{saleProfile.full_name || '—'}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                        <span className="text-slate-400 font-medium">Tiền thuê:</span>
                        <span className="font-mono font-extrabold text-accent text-sm">{Number(item.rent_price).toLocaleString('vi-VN')}đ/tháng</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Thời hạn:</span>
                        <span className="font-mono font-semibold text-slate-800">{formatDateDisplay(item.start_date)} - {formatDateDisplay(item.end_date)}</span>
                      </div>
                    </div>

                    {/* Action buttons footer */}
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                      {role !== 'sales_agent' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-indigo-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHandoverSourceType('rental');
                            setHandoverContract(item);
                            setIsHandoverOpen(true);
                          }}
                          title="Biên bản bàn giao phòng"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {role !== 'sales_agent' && role !== 'landlord' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" asChild title="Gia hạn">
                          <Link href={`${pathPrefix}/contracts/create-rental?renew_from_id=${item.id}`}>
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}

                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600" asChild title="In">
                        <Link href={`${pathPrefix}/contracts/${item.id}/print`}>
                          <Printer className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (Chỉ hiện trên máy tính >= md) */}
            <div className="hidden md:block overflow-x-auto w-full max-w-full touch-pan-x">
              <table className="w-full min-w-[850px] text-sm border-collapse">
                <thead className="bg-bg-subtle border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Mã hợp đồng</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Phòng / Tòa nhà</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Khách thuê (Bên B)</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Nhân viên Sale</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Tiền thuê</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-ink-muted uppercase tracking-wider">Thời hạn</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-ink-muted uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink">
                  {paginatedRentals.map((item) => {
                    const statusInfo = rentalStatusLabels[item.status] || { label: item.status, color: 'bg-bg-subtle text-ink-muted' };
                    return (
                      <tr 
                        key={item.id} 
                        className="hover:bg-bg-subtle/50 transition-colors cursor-pointer"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                          setViewRental(item);
                          setIsViewRentalOpen(true);
                        }}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-xs">{item.contract_code}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-accent">Phòng {item.rooms?.code || '---'}</span>
                          <p className="text-xs text-ink-muted truncate max-w-[180px] font-medium mt-0.5">
                            {item.rooms?.buildings?.name || 'Vị trí khác'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-ink">{item.party_b_name}</span>
                          <p className="text-xs text-ink-muted font-mono mt-0.5">{item.party_b_phone}</p>
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const agentId = item.sales_agent_id || item.created_by;
                            const saleProfile = agentId ? profilesMap.get(agentId) : null;
                            if (!saleProfile) return <span className="font-semibold text-ink-muted text-xs">Hệ thống</span>;
                            return (
                              <>
                                <span className="font-semibold text-ink text-xs">{saleProfile.full_name || '—'}</span>
                                <p className="text-xs text-ink-muted font-mono mt-0.5">{saleProfile.phone || '—'}</p>
                              </>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono font-bold text-accent text-sm">
                            {Number(item.rent_price).toLocaleString('vi-VN')}đ/th
                          </span>
                          {(item.commission_rate_raw || item.rooms?.rose) && (
                            <p className="text-[10px] text-emerald-600 font-bold mt-0.5 whitespace-nowrap">
                              Hoa hồng: {(item.commission_amount !== undefined && item.commission_amount !== null && Number(item.commission_amount) > 0
                                ? Number(item.commission_amount)
                                : calculateCommissionAmount(item.rooms?.price || 0, item.rooms?.rose || '', getContractTermMonths(item.start_date, item.end_date))
                              ).toLocaleString('vi-VN')}đ ({item.commission_rate_raw || item.rooms?.rose})
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-mono font-medium text-ink-muted">
                          <div>{formatDateDisplay(item.start_date)} - {formatDateDisplay(item.end_date)}</div>
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-sans font-semibold mt-0.5" title="Tự động gia hạn theo điều khoản nếu không báo hủy trước 30 ngày">
                            🔄 Tự động gia hạn (30d)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge className={`${statusInfo.color} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant="outline">
                              {statusInfo.label}
                            </Badge>
                            {(() => {
                              if (item.status !== 'active' || !item.end_date) return null;
                              const today = new Date();
                              today.setHours(0,0,0,0);
                              const end = new Date(item.end_date);
                              end.setHours(0,0,0,0);
                              const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                              if (diffDays >= 0 && diffDays <= 30) {
                                return (
                                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[9px] rounded-full flex items-center gap-1 animate-pulse" variant="outline">
                                    ⚠️ Sắp hết hạn ({diffDays}d)
                                  </Badge>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. Primary Action Button (Handover) */}
                            {role !== 'sales_agent' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-2.5 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-800 text-xs font-bold gap-1 rounded-lg shadow-none"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHandoverSourceType('rental');
                                  setHandoverContract(item);
                                  setIsHandoverOpen(true);
                                }}
                                title="Biên bản bàn giao phòng"
                              >
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                <span className="inline">Bàn giao</span>
                              </Button>
                            )}

                            {/* 2. Quick Print Button */}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100" asChild title="In hợp đồng">
                              <Link href={`${pathPrefix}/contracts/${item.id}/print`}>
                                <Printer className="h-4 w-4" />
                              </Link>
                            </Button>

                            {/* 3. Quick Commission Update Button */}
                            {onOpenCommissionModal && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenCommissionModal('rental', item);
                                }}
                                title="Cập nhật % hoa hồng công ty"
                              >
                                <Percent className="h-4 w-4 text-amber-600" />
                              </Button>
                            )}

                            {/* 4. More Actions Dropdown Menu (3 Dots) */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100" title="Thao tác khác">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white border-border rounded-xl shadow-lg w-52 text-xs font-semibold p-1.5 space-y-0.5">
                                <DropdownMenuItem 
                                  className="cursor-pointer py-2 px-2.5 rounded-lg flex items-center gap-2 text-slate-700 hover:bg-slate-100"
                                  onClick={() => {
                                    setViewRental(item);
                                    setIsViewRentalOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 text-slate-500" />
                                  <span>Xem chi tiết hợp đồng</span>
                                </DropdownMenuItem>

                                {onOpenCommissionModal && (
                                  <DropdownMenuItem 
                                    className="cursor-pointer py-2 px-2.5 rounded-lg flex items-center gap-2 text-amber-700 hover:bg-amber-50"
                                    onClick={() => onOpenCommissionModal('rental', item)}
                                  >
                                    <Percent className="h-4 w-4 text-amber-600" />
                                    <span>Cập nhật % hoa hồng</span>
                                  </DropdownMenuItem>
                                )}

                                {role !== 'sales_agent' && role !== 'landlord' && (
                                  <DropdownMenuItem 
                                    className="cursor-pointer py-2 px-2.5 rounded-lg flex items-center gap-2 text-slate-700 hover:bg-slate-100"
                                    asChild
                                  >
                                    <Link href={`${pathPrefix}/contracts/create-rental?renew_from_id=${item.id}`}>
                                      <RefreshCw className="h-4 w-4 text-emerald-600" />
                                      <span>Gia hạn hợp đồng</span>
                                    </Link>
                                  </DropdownMenuItem>
                                )}

                                {role !== 'sales_agent' && role !== 'landlord' && (
                                  <>
                                    <DropdownMenuSeparator className="my-1 border-slate-100" />
                                    <DropdownMenuItem 
                                      className="cursor-pointer py-2 px-2.5 rounded-lg flex items-center gap-2 text-rose-600 hover:bg-rose-50 font-bold"
                                      onClick={async () => {
                                        if (confirm('Bạn có chắc muốn xóa hợp đồng thuê này và giải phóng phòng về trạng thái trống?')) {
                                          try {
                                            await removeRental(item.id);
                                            if (item.room_id) {
                                              await supabase
                                                .from('rooms')
                                                .update({ status: 'available' })
                                                .eq('id', item.room_id);
                                            }
                                            toast.success('Xóa hợp đồng và giải phóng phòng thành công!');
                                          } catch (err: any) {
                                            toast.error('Lỗi khi xóa hợp đồng: ' + err.message);
                                          }
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span>Xóa hợp đồng</span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        {!rentalsLoading && filteredRentals.length === 0 && (
          <div className="text-center py-12 text-ink-muted bg-white">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-35" />
            <p className="text-sm font-semibold">Chưa có hợp đồng thuê chính thức nào</p>
            <p className="text-xs text-ink-muted mt-1">Bấm nút &quot;Soạn hợp đồng thuê&quot; hoặc chuyển đổi từ Hợp đồng cọc để bắt đầu</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
