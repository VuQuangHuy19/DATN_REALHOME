'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Printer, RefreshCw, FileSignature, ClipboardCheck, Trash2, FileText, Eye, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { calculateCommissionAmount } from '@/features/finance/services/commission';

interface ContractTableRowProps {
  item: any;
  pathPrefix: string;
  role: string | undefined;
  profilesMap: Map<string, any>;
  statusLabels: Record<string, { label: string; color: string }>;
  formatDateDisplay: (d: string | null | undefined) => string;
  onViewDeposit: (item: any) => void;
  onLandlordConfirm: (id: string, isOverride: boolean) => void;
  onStatusChange: (id: string, status: string) => void;
  onOpenHandover: (item: any) => void;
  onRemoveDeposit: (id: string) => void;
  routerPush: (path: string) => void;
}

export function ContractTableRow({
  item,
  pathPrefix,
  role,
  profilesMap,
  statusLabels,
  formatDateDisplay,
  onViewDeposit,
  onLandlordConfirm,
  onStatusChange,
  onOpenHandover,
  onRemoveDeposit,
  routerPush,
}: ContractTableRowProps) {
  const statusInfo = statusLabels[item.status] || {
    label: item.status,
    color: 'bg-bg-subtle text-ink-muted border-border',
  };
  const agentId = item.sales_agent_id || item.created_by;
  const saleProfile = agentId ? profilesMap.get(agentId) : null;
  const isOverdueApproval =
    item.status === 'active' &&
    item.created_at &&
    new Date().getTime() - new Date(item.created_at).getTime() > 20 * 60 * 1000;

  return (
    <tr
      key={item.id}
      className="hover:bg-bg-subtle/50 transition-colors cursor-pointer"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
        onViewDeposit(item);
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
        {!saleProfile ? (
          <span className="font-semibold text-ink-muted text-xs">Hệ thống</span>
        ) : (
          <>
            <span className="font-semibold text-ink text-xs">{saleProfile.full_name || '—'}</span>
            <p className="text-xs text-ink-muted font-mono mt-0.5">{saleProfile.phone || '—'}</p>
          </>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-mono font-bold text-accent text-sm">
          {Number(item.deposit_amount).toLocaleString('vi-VN')}đ
        </span>
        {(item.commission_rate_raw || item.rooms?.rose) && (
          <p className="text-[10px] text-emerald-600 font-bold mt-0.5 whitespace-nowrap">
            Hoa hồng:{' '}
            {(item.commission_amount !== undefined && item.commission_amount !== null && Number(item.commission_amount) > 0
              ? Number(item.commission_amount)
              : calculateCommissionAmount(item.rooms?.price || 0, item.rooms?.rose || '', item.lease_duration_months)
            ).toLocaleString('vi-VN')}
            đ ({item.commission_rate_raw || item.rooms?.rose})
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-center text-xs font-mono font-medium text-ink-muted">
        {formatDateDisplay(item.deadline_sign_contract)}
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex flex-col items-center gap-1">
          <Badge
            className={`${statusInfo.color} border font-bold text-[10px] rounded-full uppercase tracking-wider`}
            variant="outline"
          >
            {statusInfo.label}
          </Badge>
          {isOverdueApproval && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full animate-pulse">
              🚨 Quá 20p chưa duyệt
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {/* 👁️ 1. Xem chi tiết hợp đồng */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100" 
            onClick={() => onViewDeposit(item)}
            title="Xem chi tiết hợp đồng"
          >
            <Eye className="h-4 w-4 text-slate-600" />
          </Button>

          {/* 🟢 2. Duyệt cọc / Nhận cọc / Lập HĐ thuê */}
          {role === 'landlord' && item.status === 'active' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-700 font-bold text-xs py-1 h-8 rounded-lg"
              onClick={() => onLandlordConfirm(item.id, false)}
            >
              Nhận cọc
            </Button>
          )}

          {(role === 'company_admin' || role === 'manager' || role === 'super_admin' || !role) && item.status === 'active' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800 font-bold text-xs py-1 h-8 rounded-lg shadow-none"
              onClick={() => onLandlordConfirm(item.id, true)}
              title="Duyệt đè hợp đồng cọc thay Chủ nhà"
            >
              Duyệt đè
            </Button>
          )}

          {role !== 'sales_agent' && item.status !== 'active' && ['confirmed', 'signed', 'deposited', 'draft'].includes(item.status) && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2.5 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 text-xs font-bold gap-1 rounded-lg shadow-none"
              onClick={(e) => {
                e.stopPropagation();
                routerPush(`${pathPrefix}/contracts/create-rental?deposit_id=${item.id}`);
              }}
              title="Chuyển cọc này thành Hợp đồng thuê chính thức"
            >
              <FileSignature className="h-3.5 w-3.5" />
              <span className="inline">Lập HĐ thuê</span>
            </Button>
          )}

          {/* 🔄 3. Đổi trạng thái hợp đồng (Chờ duyệt, Đã cọc, Hủy cọc, Mất cọc, Trả cọc) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" title="Đổi trạng thái hợp đồng">
                <RefreshCw className="h-4 w-4 text-blue-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-border rounded-xl shadow-lg w-52 text-xs font-semibold p-1.5 space-y-1">
              <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                Đổi trạng thái HĐ
              </div>
              <DropdownMenuItem 
                className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-amber-700 hover:bg-amber-50"
                onClick={() => onStatusChange(item.id, 'active')}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Chờ duyệt (active)</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-emerald-700 hover:bg-emerald-50"
                onClick={() => onStatusChange(item.id, 'signed')}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Đã cọc (signed)</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-rose-700 hover:bg-rose-50"
                onClick={() => onStatusChange(item.id, 'cancelled')}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Hủy cọc (cancelled)</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-orange-700 hover:bg-orange-50"
                onClick={() => onStatusChange(item.id, 'forfeited')}
              >
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Mất cọc (forfeited)</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer py-1.5 px-2.5 rounded-lg flex items-center gap-2 text-sky-700 hover:bg-sky-50"
                onClick={() => onStatusChange(item.id, 'refunded')}
              >
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>Trả cọc (refunded)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 🖨️ 4. In hợp đồng */}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100" asChild title="In hợp đồng">
            <Link href={`${pathPrefix}/contracts/${item.id}/print`}>
              <Printer className="h-4 w-4" />
            </Link>
          </Button>

          {/* 🗑️ 5. Xóa hợp đồng (màu đỏ) */}
          {role !== 'sales_agent' && role !== 'landlord' && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              onClick={() => {
                if (confirm('Bạn có chắc muốn xóa hợp đồng cọc này?')) {
                  onRemoveDeposit(item.id);
                }
              }}
              title="Xóa hợp đồng"
            >
              <Trash2 className="h-4 w-4 text-rose-600" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
