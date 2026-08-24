'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pencil, Trash2, Search, FileText, Loader2,
  Printer, RefreshCw, ClipboardCheck, FileSignature
} from 'lucide-react';
import { calculateCommissionAmount } from '@/features/finance/services/commission';

interface DepositContractsTableProps {
  filteredDeposits: any[];
  depositsLoading: boolean;
  depositSearch: string;
  setDepositSearch: (val: string) => void;
  statusLabels: Record<string, { label: string; color: string }>;
  profilesMap: Map<string, any>;
  role: string | null;
  pathPrefix: string;
  formatDateDisplay: (dateStr: string | null | undefined) => string;
  handleLandlordConfirm: (id: string, isOverride?: boolean) => void;
  handleStatusChange: (id: string, newStatus: string) => void;
  removeDeposit: (id: string) => void;
  setViewDeposit: (item: any) => void;
  setIsViewDepositOpen: (open: boolean) => void;
  setHandoverContract: (item: any) => void;
  setHandoverSourceType: (type: 'deposit' | 'rental') => void;
  setIsHandoverOpen: (open: boolean) => void;
}

export function DepositContractsTable({
  filteredDeposits,
  depositsLoading,
  depositSearch,
  setDepositSearch,
  statusLabels,
  profilesMap,
  role,
  pathPrefix,
  formatDateDisplay,
  handleLandlordConfirm,
  handleStatusChange,
  removeDeposit,
  setViewDeposit,
  setIsViewDepositOpen,
  setHandoverContract,
  setHandoverSourceType,
  setIsHandoverOpen,
}: DepositContractsTableProps) {
  const router = useRouter();

  return (
    <Card className="border-border shadow-none rounded-lg bg-white overflow-hidden">
      <CardHeader className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <Input 
            placeholder="Tìm hợp đồng cọc theo tên khách, SĐT, mã hợp đồng hoặc mã phòng..." 
            value={depositSearch} 
            onChange={(e) => setDepositSearch(e.target.value)} 
            className="pl-9 rounded-lg border-border focus-visible:ring-accent" 
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {depositsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : (
          <>
            {/* Mobile Card List (Chỉ hiện trên di động < md) */}
            <div className="block md:hidden space-y-3 p-3 bg-slate-50/50">
              {filteredDeposits.map((item) => {
                const statusInfo = statusLabels[item.status] || { label: item.status, color: 'bg-bg-subtle text-ink-muted border-border' };
                const agentId = item.sales_agent_id || item.created_by;
                const saleProfile = agentId ? profilesMap.get(agentId) : null;
                const isOverdueApproval = item.status === 'active' && item.created_at && (new Date().getTime() - new Date(item.created_at).getTime() > 20 * 60 * 1000);

                return (
                  <div 
                    key={item.id} 
                    className="p-3.5 border border-slate-200 rounded-xl bg-white shadow-xs space-y-2.5 cursor-pointer active:bg-slate-50 transition-colors"
                    onClick={() => {
                      setViewDeposit(item);
                      setIsViewDepositOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {item.contract_code}
                      </span>
                      <div className="flex items-center gap-1">
                        <Badge className={`${statusInfo.color} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant="outline">
                          {statusInfo.label}
                        </Badge>
                        {isOverdueApproval && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full animate-pulse">
                            🚨 Quá 20p
                          </span>
                        )}
                      </div>
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
                        <span className="text-slate-400 font-medium">Tiền đặt cọc:</span>
                        <span className="font-mono font-extrabold text-accent text-sm">{Number(item.deposit_amount).toLocaleString('vi-VN')}đ</span>
                      </div>

                      {item.deadline_sign_contract && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Hạn ký HĐ thuê:</span>
                          <span className="font-mono font-bold text-rose-600">{formatDateDisplay(item.deadline_sign_contract)}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons footer */}
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                      {(role === 'company_admin' || role === 'manager') && ['signed', 'active', 'draft'].includes(item.status) && (
                        <Button variant="outline" size="sm" className="h-7 text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200" asChild>
                          <Link href={`${pathPrefix}/contracts/create-rental?deposit_id=${item.id}`}>
                            <FileSignature className="h-3.5 w-3.5 mr-1" /> Lập HĐ thuê
                          </Link>
                        </Button>
                      )}

                      {role === 'landlord' && item.status === 'active' && (
                        <Button variant="outline" size="sm" className="h-7 text-xs font-bold bg-green-50 text-green-700 border-green-200" onClick={() => handleLandlordConfirm(item.id, false)}>
                          Nhận cọc
                        </Button>
                      )}

                      {(role === 'company_admin' || role === 'manager') && item.status === 'active' && (
                        <Button variant="outline" size="sm" className="h-7 text-xs font-bold bg-amber-50 text-amber-800 border-amber-300" onClick={() => handleLandlordConfirm(item.id, true)}>
                          Duyệt đè
                        </Button>
                      )}

                      {role !== 'sales_agent' && role !== 'landlord' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600" asChild title="Chỉnh sửa">
                          <Link href={`${pathPrefix}/contracts/${item.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5" />
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
                    <th className="px-4 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Tiền đặt cọc</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-ink-muted uppercase tracking-wider">Hạn ký HĐ thuê</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-ink-muted uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink">
                  {filteredDeposits.map((item) => {
                    const statusInfo = statusLabels[item.status] || { label: item.status, color: 'bg-bg-subtle text-ink-muted border-border' };
                    return (
                      <tr 
                        key={item.id} 
                        className="hover:bg-bg-subtle/50 transition-colors cursor-pointer"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                          setViewDeposit(item);
                          setIsViewDepositOpen(true);
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
                            {Number(item.deposit_amount).toLocaleString('vi-VN')}đ
                          </span>
                          {(item.commission_rate_raw || item.rooms?.rose) && (
                            <p className="text-[10px] text-emerald-600 font-bold mt-0.5 whitespace-nowrap">
                              Hoa hồng: {(item.commission_amount !== undefined && item.commission_amount !== null && Number(item.commission_amount) > 0
                                ? Number(item.commission_amount)
                                : calculateCommissionAmount(item.rooms?.price || 0, item.rooms?.rose || '', item.lease_duration_months)
                              ).toLocaleString('vi-VN')}đ ({item.commission_rate_raw || item.rooms?.rose})
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-mono font-medium text-ink-muted">
                          {formatDateDisplay(item.deadline_sign_contract)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {(() => {
                            const isOverdueApproval = item.status === 'active' && item.created_at && (new Date().getTime() - new Date(item.created_at).getTime() > 20 * 60 * 1000);
                            return (
                              <div className="flex flex-col items-center gap-1">
                                <Badge className={`${statusInfo.color} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant="outline">
                                  {statusInfo.label}
                                </Badge>
                                {isOverdueApproval && (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full animate-pulse">
                                    🚨 Quá 20p chưa duyệt
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {(role === 'company_admin' || role === 'manager') && ['signed', 'active', 'draft'].includes(item.status) && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-emerald-600 hover:bg-bg-subtle" asChild title="Chuyển thành Hợp đồng thuê">
                                <Link href={`${pathPrefix}/contracts/create-rental?deposit_id=${item.id}`}>
                                  <FileText className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                            
                            {/* Landlord Confirm Button */}
                            {role === 'landlord' && item.status === 'active' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 font-bold text-xs py-1 h-8 rounded-lg"
                                onClick={() => handleLandlordConfirm(item.id, false)}
                              >
                                Nhận cọc
                              </Button>
                            )}

                            {/* Admin / Manager Override Confirm Button */}
                            {(role === 'company_admin' || role === 'manager') && item.status === 'active' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800 font-bold text-xs py-1 h-8 rounded-lg shadow-none"
                                onClick={() => handleLandlordConfirm(item.id, true)}
                                title="Duyệt đè hợp đồng cọc thay Chủ nhà nếu xác nhận tiền cọc đã về"
                              >
                                Duyệt đè
                              </Button>
                            )}
                            
                            {/* Edit contract (Admin / Manager only) */}
                            {role !== 'sales_agent' && role !== 'landlord' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle" asChild title="Chỉnh sửa hợp đồng">
                                <Link href={`${pathPrefix}/contracts/${item.id}/edit`}>
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}

                            {/* Change status (Admin / Manager only) */}
                            {role !== 'sales_agent' && role !== 'landlord' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle" title="Thay đổi trạng thái">
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white border-border rounded-lg shadow-md text-ink text-xs font-semibold">
                                  <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'active')}>
                                    Chờ xác nhận (active)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'signed')}>
                                    Đã nhận cọc (signed)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'cancelled')}>
                                    Đã hủy cọc (cancelled)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'forfeited')}>
                                    Khách mất cọc (forfeited)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'refunded')}>
                                    Đã trả cọc (refunded)
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}

                            {role !== 'sales_agent' && ['confirmed', 'signed', 'deposited', 'active'].includes(item.status) && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-2.5 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 text-xs font-bold gap-1 rounded-lg shadow-none mr-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`${pathPrefix}/contracts/create-rental?deposit_id=${item.id}`);
                                }}
                                title="Chuyển cọc này thành Hợp đồng thuê chính thức"
                              >
                                <FileSignature className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Lập HĐ thuê</span>
                              </Button>
                            )}

                            {role !== 'sales_agent' && ['confirmed', 'signed', 'deposited', 'active', 'converted', 'refunded'].includes(item.status) && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-ink hover:text-indigo-600 hover:bg-bg-subtle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHandoverSourceType('deposit');
                                  setHandoverContract(item);
                                  setIsHandoverOpen(true);
                                }}
                                title="Biên bản bàn giao phòng"
                              >
                                <ClipboardCheck className="h-4 w-4" />
                              </Button>
                            )}

                            <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle" asChild title="In hợp đồng">
                              <Link href={`${pathPrefix}/contracts/${item.id}/print`}>
                                <Printer className="h-4 w-4" />
                              </Link>
                            </Button>
                            
                            {role !== 'sales_agent' && role !== 'landlord' && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10"
                                onClick={() => {
                                  if (confirm('Bạn có chắc muốn xóa hợp đồng cọc này?')) {
                                    removeDeposit(item.id);
                                  }
                                }} 
                                title="Xóa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
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
      </CardContent>
    </Card>
  );
}
