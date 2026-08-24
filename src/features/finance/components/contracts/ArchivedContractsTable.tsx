'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Search, FileText, Printer } from 'lucide-react';

interface ArchivedContractsTableProps {
  filteredArchived: any[];
  archivedSearch: string;
  setArchivedSearch: (val: string) => void;
  pathPrefix: string;
  setViewDeposit: (item: any) => void;
  setIsViewDepositOpen: (open: boolean) => void;
  setViewRental: (item: any) => void;
  setIsViewRentalOpen: (open: boolean) => void;
}

export function ArchivedContractsTable({
  filteredArchived,
  archivedSearch,
  setArchivedSearch,
  pathPrefix,
  setViewDeposit,
  setIsViewDepositOpen,
  setViewRental,
  setIsViewRentalOpen,
}: ArchivedContractsTableProps) {
  const archivedStatusLabels: Record<string, { label: string; color: string }> = {
    ended: { label: 'Đã hết hạn', color: 'bg-slate-100 text-slate-700 border-slate-300' },
    terminated: { label: 'Kết thúc sớm', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-800 border-red-300' },
    forfeited: { label: 'Mất cọc', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    refunded: { label: 'Đã trả cọc', color: 'bg-teal-100 text-teal-800 border-teal-300' },
  };

  return (
    <Card className="border-border shadow-none rounded-lg bg-white overflow-hidden">
      <CardHeader className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <Input 
            placeholder="Tìm hợp đồng đã thanh lý/hết hạn theo tên khách, SĐT, mã hợp đồng hoặc mã phòng..." 
            value={archivedSearch} 
            onChange={(e) => setArchivedSearch(e.target.value)} 
            className="pl-9 rounded-lg border-border focus-visible:ring-accent" 
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile Card List Hợp Đồng Thanh Lý (Hiện trên mobile < md) */}
        <div className="block md:hidden space-y-3 p-3 bg-slate-50/50">
          {filteredArchived.map((item: any) => {
            const statusInfo = archivedStatusLabels[item.status] || { label: item.status, color: 'bg-bg-subtle text-ink-muted' };

            return (
              <div 
                key={item.id} 
                className="p-3.5 border border-slate-200 rounded-xl bg-white shadow-xs space-y-2.5 cursor-pointer active:bg-slate-50 transition-colors"
                onClick={() => {
                  if (item.contract_category === 'thuê') {
                    setViewRental(item);
                    setIsViewRentalOpen(true);
                  } else {
                    setViewDeposit(item);
                    setIsViewDepositOpen(true);
                  }
                }}
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {item.contract_code} ({item.contract_category})
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

                  <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                    <span className="text-slate-400 font-medium">Giá tiền / Cọc:</span>
                    <span className="font-mono font-extrabold text-accent text-sm">{Number(item.rent_price || item.deposit_amount).toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
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
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Loại HĐ</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Phòng / Tòa nhà</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Khách thuê (Bên B)</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Giá tiền / Cọc</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-ink-muted uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-ink">
              {filteredArchived.map((item: any) => {
                const statusInfo = archivedStatusLabels[item.status] || { label: item.status, color: 'bg-bg-subtle text-ink-muted' };
                return (
                  <tr 
                    key={item.id} 
                    className="hover:bg-bg-subtle/50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (item.contract_category === 'thuê') {
                        setViewRental(item);
                        setIsViewRentalOpen(true);
                      } else {
                        setViewDeposit(item);
                        setIsViewDepositOpen(true);
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-xs">{item.contract_code}</td>
                    <td className="px-4 py-3 font-bold text-xs uppercase text-ink-muted">
                      HĐ {item.contract_category}
                    </td>
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
                    <td className="px-4 py-3 text-right font-mono font-bold text-accent text-sm">
                      {Number(item.rent_price || item.deposit_amount).toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`${statusInfo.color} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant="outline">
                        {statusInfo.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle" asChild title="Xem / In hợp đồng">
                        <Link href={`${pathPrefix}/contracts/${item.id}/print`}>
                          <Printer className="h-4 w-4" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredArchived.length === 0 && (
          <div className="text-center py-12 text-ink-muted bg-white">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-35" />
            <p className="text-sm font-semibold">Không có hợp đồng thanh lý hoặc hết hạn nào</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
