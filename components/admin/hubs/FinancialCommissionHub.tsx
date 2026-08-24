'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Receipt,
  Sliders,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Building2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAdminModule } from '@/features/admin/context/admin-module-context';
import { ArrowLeft, PieChart as PieChartIcon, CheckCircle2, Clock, ShieldCheck, Sparkles, Download, Check, Layers, Target } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export function FinancialCommissionHub() {
  const { company } = useAuth();
  const { activeModule, setActiveModule } = useAdminModule();
  const companyId = company?.id;

  const [loading, setLoading] = useState(true);
  const [financialStats, setFinancialStats] = useState({
    monthlyRevenue: 0,
    operatingExpense: 0,
    netProfit: 0,
    pendingCommission: 0,
    landlordSettlements: 0,
    overdueInvoices: 0,
  });

  const [commissionPayouts, setCommissionPayouts] = useState<any[]>([]);
  const [landlordPayouts, setLandlordPayouts] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<'current_month' | 'last_month' | 'quarter' | 'all_time'>('current_month');
  
  const [commissionPieData, setCommissionPieData] = useState<any[]>([]);
  const [commissionSummary, setCommissionSummary] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    paidPercent: 0,
  });

  const [landlordChartData, setLandlordChartData] = useState<any[]>([]);
  const [landlordSummary, setLandlordSummary] = useState({
    totalRentedRooms: 0,
    totalCollected: 0,
    totalCommissionRetained: 0,
    totalNetPayout: 0,
  });

  useEffect(() => {
    if (!companyId) return;

    async function fetchFinanceData() {
      setLoading(true);
      try {
        // Determine date filter based on selected timeframe
        const now = new Date();
        let startDateStr = '';
        if (timeframe === 'current_month') {
          startDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        } else if (timeframe === 'last_month') {
          const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          startDateStr = `${lastM.getFullYear()}-${String(lastM.getMonth() + 1).padStart(2, '0')}-01`;
        } else if (timeframe === 'quarter') {
          const qMonth = Math.floor(now.getMonth() / 3) * 3;
          startDateStr = `${now.getFullYear()}-${String(qMonth + 1).padStart(2, '0')}-01`;
        }

        // 1. Fetch Invoices from DB
        let invQuery = supabase
          .from('invoices')
          .select('id, invoice_code, total_amount, rent_amount, status, due_date, landlord_payout_amount, management_fee_amount, created_at')
          .eq('company_id', companyId);

        if (startDateStr && timeframe !== 'all_time') {
          invQuery = invQuery.gte('created_at', startDateStr);
        }

        const { data: invoiceData } = await invQuery;
        const invoices = invoiceData || [];

        let revenue = 0;
        let expenses = 0;
        let overdue = 0;
        let landlordTotal = 0;

        invoices.forEach((inv: any) => {
          const amt = Number(inv.total_amount || 0);
          const st = (inv.status || '').toLowerCase();
          if (st === 'paid' || st === 'đã thanh toán') {
            revenue += amt;
          }
          if (st === 'overdue' || st === 'quá hạn') {
            overdue++;
          }
          expenses += Number(inv.management_fee_amount || 0);
          landlordTotal += Number(inv.landlord_payout_amount || 0);
        });

        // 2. Fetch Employee KPIs for Sales Commissions from DB
        let kpiQuery = supabase
          .from('employee_kpis')
          .select('id, employee_name, revenue_generated, commission_earned, status, period, score, created_at')
          .eq('company_id', companyId);

        if (startDateStr && timeframe !== 'all_time') {
          kpiQuery = kpiQuery.gte('created_at', startDateStr);
        }

        const { data: kpiData } = await kpiQuery;
        const kpis = kpiData || [];
        setCommissionPayouts(kpis.slice(0, 8));

        let totalComm = 0;
        let paidComm = 0;
        let pendingComm = 0;

        kpis.forEach((k: any) => {
          const c = Number(k.commission_earned || 0);
          totalComm += c;
          const st = (k.status || '').toLowerCase();
          if (st === 'approved' || st === 'completed' || st === 'đã duyệt' || st === 'đã trả') {
            paidComm += c;
          } else {
            pendingComm += c;
          }
        });

        // If employee_kpis has no records yet, sum commission directly from rental_contracts
        if (totalComm === 0) {
          let renCommQuery = supabase
            .from('rental_contracts')
            .select('id, commission_amount, status, created_at')
            .eq('company_id', companyId);

          if (startDateStr && timeframe !== 'all_time') {
            renCommQuery = renCommQuery.gte('created_at', startDateStr);
          }

          const { data: renCommData } = await renCommQuery;
          (renCommData || []).forEach((c: any) => {
            const amt = Number(c.commission_amount || 0);
            totalComm += amt;
            const st = (c.status || '').toLowerCase();
            if (st === 'active' || st === 'signed' || st === 'completed') {
              paidComm += amt;
            } else {
              pendingComm += amt;
            }
          });
        }

        const paidPct = totalComm > 0 ? Math.round((paidComm / totalComm) * 100) : 0;
        setCommissionSummary({
          total: totalComm,
          paid: paidComm,
          pending: pendingComm,
          paidPercent: paidPct,
        });

        setCommissionPieData([
          { name: 'Đã thanh toán', value: paidComm, fill: '#10b981' },
          { name: 'Chưa trả (Chờ duyệt)', value: pendingComm, fill: '#f59e0b' },
        ]);

        // 3. Fetch Landlords & calculate real brokerage commission per landlord from DB
        const { data: landlordData } = await supabase
          .from('landlords')
          .select('id, name, bank_name, bank_account_number, bank_account_owner, properties_count')
          .eq('company_id', companyId);

        const landlords = landlordData || [];
        setLandlordPayouts(landlords.slice(0, 6));

        // Fetch Buildings & Rooms to map room -> landlord
        const { data: bldRows } = await supabase
          .from('buildings')
          .select('id, code, landlord_id')
          .eq('company_id', companyId);

        const { data: rmRows } = await supabase
          .from('rooms')
          .select('id, code, building_id, status')
          .eq('company_id', companyId);

        const bldMap = new Map<string, string>();
        (bldRows || []).forEach((b: any) => {
          if (b.code && b.landlord_id) bldMap.set(b.code, b.landlord_id);
        });

        const roomLandlordMap = new Map<string, string>();
        (rmRows || []).forEach((r: any) => {
          if (r.id && r.building_id) {
            const lId = bldMap.get(r.building_id);
            if (lId) roomLandlordMap.set(r.id, lId);
          }
        });

        // Fetch Contracts for Brokerage Commissions
        let renQuery = supabase
          .from('rental_contracts')
          .select('id, room_id, commission_amount, status, created_at')
          .eq('company_id', companyId);

        let depQuery = supabase
          .from('deposit_contracts')
          .select('id, room_id, commission_amount, status, created_at')
          .eq('company_id', companyId);

        if (startDateStr && timeframe !== 'all_time') {
          renQuery = renQuery.gte('created_at', startDateStr);
          depQuery = depQuery.gte('created_at', startDateStr);
        }

        const [{ data: renData }, { data: depData }] = await Promise.all([renQuery, depQuery]);

        let totalLandlordPaidComm = 0;
        let totalLandlordPendingComm = 0;

        const landlordStats = new Map<string, { name: string; roomsCount: number; paidCommission: number; pendingCommission: number }>();
        landlords.forEach((l: any) => {
          landlordStats.set(l.id, {
            name: l.name || 'Chủ nhà',
            roomsCount: l.properties_count || 0,
            paidCommission: 0,
            pendingCommission: 0,
          });
        });

        const processContract = (c: any) => {
          const lId = roomLandlordMap.get(c.room_id);
          const comm = Number(c.commission_amount || 0);
          const st = (c.status || '').toLowerCase();
          const isPaid = st === 'active' || st === 'signed' || st === 'completed' || st === 'đã thanh toán';

          if (isPaid) totalLandlordPaidComm += comm;
          else totalLandlordPendingComm += comm;

          if (lId && landlordStats.has(lId)) {
            const item = landlordStats.get(lId)!;
            const commMillions = Math.round((comm / 1000000) * 10) / 10;
            if (isPaid) item.paidCommission += commMillions;
            else item.pendingCommission += commMillions;
          }
        };

        (renData || []).forEach(processContract);
        (depData || []).forEach(processContract);

        const totalRentedRoomsCount = (rmRows || []).filter((r: any) => r.status === 'rented').length;

        setLandlordSummary({
          totalRentedRooms: totalRentedRoomsCount,
          totalCollected: totalLandlordPaidComm + totalLandlordPendingComm,
          totalCommissionRetained: totalLandlordPaidComm,
          totalNetPayout: totalLandlordPendingComm,
        });

        const lChartItems = Array.from(landlordStats.values());
        setLandlordChartData(lChartItems);

        setFinancialStats({
          monthlyRevenue: revenue || totalLandlordPaidComm,
          operatingExpense: expenses,
          netProfit: Math.max(0, (revenue || totalLandlordPaidComm) - expenses),
          pendingCommission: pendingComm,
          landlordSettlements: totalLandlordPendingComm,
          overdueInvoices: overdue,
        });
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu phân hệ Tài chính:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFinanceData();
  }, [companyId, timeframe]);

  const formatVND = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner Hub */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-700 via-orange-700 to-amber-600 p-6 text-white shadow-lg">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {activeModule !== 'all' && (
              <button
                onClick={() => setActiveModule('all')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all mb-3 cursor-pointer border border-white/20 backdrop-blur-md"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Quay lại Tổng quan Tất cả</span>
              </button>
            )}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-amber-100 backdrop-blur-md mb-2">
              <Wallet className="h-3.5 w-3.5 text-amber-300" />
              <span>Phân Hệ 3 • Tài Chính, Thu Chi & Hoa Hồng</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Financial & Commission Command Center</h1>
            <p className="text-sm text-amber-100/90 mt-1 max-w-xl">
              Dữ liệu thực từ DB: Kiểm soát dòng tiền doanh thu, đối soát & duyệt chi trả hoa hồng Sales và quyết toán công nợ Chủ nhà.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild className="bg-white text-amber-900 hover:bg-amber-50 font-bold shadow-md">
              <Link href="/admin/commission-policies">
                <Sliders className="h-4 w-4 mr-1.5" />
                Cài Đặt Bậc Hoa Hồng
              </Link>
            </Button>
            <Button asChild variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 font-semibold backdrop-blur-md">
              <Link href="/admin/services/invoices">
                <Receipt className="h-4 w-4 mr-1.5" />
                Sổ Quỹ Thu Chi
              </Link>
            </Button>
          </div>
        </div>

        {/* Dynamic Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <p className="text-xs text-amber-200 font-medium">Tổng Doanh Thu Đã Thu</p>
            <p className="text-xl font-bold mt-0.5">{formatVND(financialStats.monthlyRevenue)}</p>
            <p className="text-[11px] text-emerald-300 mt-1 flex items-center gap-1 font-semibold">
              <ArrowUpRight className="h-3 w-3" /> Tổng hợp từ hóa đơn
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <p className="text-xs text-amber-200 font-medium">Lợi Nhuận Ròng (P&L)</p>
            <p className="text-xl font-bold text-emerald-300 mt-0.5">{formatVND(financialStats.netProfit)}</p>
            <p className="text-[11px] text-amber-200 mt-1">Lợi nhuận ròng thực tế</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <p className="text-xs text-amber-200 font-medium">Tổng Hoa Hồng Phát Sinh</p>
            <p className="text-xl font-bold text-amber-300 mt-0.5">{formatVND(financialStats.pendingCommission)}</p>
            <p className="text-[11px] text-amber-200 mt-1">Từ dữ liệu KPI Sales</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <p className="text-xs text-amber-200 font-medium">Hóa Đơn Quá Hạn</p>
            <p className="text-xl font-bold text-rose-300 mt-0.5">{financialStats.overdueInvoices} Hóa đơn</p>
            <p className="text-[11px] text-amber-200 mt-1">Cần nhắc thanh toán</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
          <Loader2 className="h-8 w-8 text-amber-600 animate-spin mr-2" />
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Đang tải dữ liệu Tài chính & Hoa hồng...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Dynamic Timeframe Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Bộ Lọc Thời Gian Báo Cáo & Đối Soát</h4>
                <p className="text-[11px] text-slate-400">Tự động cập nhật số liệu biểu đồ theo kỳ lựa chọn</p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl overflow-x-auto">
              <button
                onClick={() => setTimeframe('current_month')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  timeframe === 'current_month' ? 'bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-300 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tháng này
              </button>
              <button
                onClick={() => setTimeframe('last_month')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  timeframe === 'last_month' ? 'bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-300 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tháng trước
              </button>
              <button
                onClick={() => setTimeframe('quarter')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  timeframe === 'quarter' ? 'bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-300 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Quý này
              </button>
              <button
                onClick={() => setTimeframe('all_time')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  timeframe === 'all_time' ? 'bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-300 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tất cả
              </button>
            </div>
          </div>

          {/* Interactive Financial & Commission Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Employee Commission Payout Breakdown (Donut Pie Chart) */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-amber-600" />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Phân Bổ Hoa Hồng Nhân Viên</h3>
                    <p className="text-xs text-slate-500">Thống kê tỷ lệ Đã chi trả vs Chưa trả (Chờ duyệt)</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold px-2.5 py-1">
                  Kỳ: {timeframe === 'current_month' ? 'Tháng này' : timeframe === 'last_month' ? 'Tháng trước' : timeframe === 'quarter' ? 'Quý này' : 'Tất cả'}
                </Badge>
              </div>

              {/* Pie Chart & Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
                <div className="h-[210px] w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={commissionPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {commissionPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [formatVND(Number(val)), 'Giá trị']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text inside Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white">{commissionSummary.paidPercent}%</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Đã thanh toán</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Đã chi trả Sales
                      </span>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.2">
                        {commissionSummary.paidPercent}%
                      </Badge>
                    </div>
                    <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">
                      {formatVND(commissionSummary.paid)}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-amber-600" /> Chưa trả / Đang giữ
                      </span>
                      <Badge className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.2">
                        {100 - commissionSummary.paidPercent}%
                      </Badge>
                    </div>
                    <p className="text-base font-extrabold text-amber-700 dark:text-amber-400 mt-1">
                      {formatVND(commissionSummary.pending)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Action */}
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Tổng phát sinh: <strong className="text-slate-900 dark:text-white font-bold">{formatVND(commissionSummary.total)}</strong></span>
                <Button asChild size="sm" variant="outline" className="text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-50 h-8">
                  <Link href="/admin/commission-policies">Duyệt Chi Trả Hoa Hồng ➔</Link>
                </Button>
              </div>
            </div>

            {/* Chart 2: Landlord Brokerage Commission Clearance (Bar Chart) */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-sky-600" />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Đối Soát Hoa Hồng Môi Giới Theo Chủ Nhà</h3>
                    <p className="text-xs text-slate-500">Thống kê số phòng lấp đầy & tiền hoa hồng môi giới đã thu vs còn nợ</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-xs font-bold px-2.5 py-1">
                  {landlordSummary.totalRentedRooms} Phòng Lấp Đầy
                </Badge>
              </div>

              {/* Bar Chart comparing Paid Commission vs Pending Commission from Landlords */}
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={landlordChartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} unit="M" />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700">
                              <p className="font-bold text-sky-400">{label}</p>
                              <p>🏠 Số phòng đẩy lấp đầy: <strong className="text-white">{item.roomsCount} phòng</strong></p>
                              <p className="text-emerald-300">🟢 Hoa hồng đã thu: <strong>{item.paidCommission} triệu đ</strong></p>
                              <p className="text-amber-300">⏳ Chủ nhà còn nợ hoa hồng: <strong>{item.pendingCommission} triệu đ</strong></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                    <Bar dataKey="paidCommission" name="Hoa Hồng Đã Thu (Triệu đ)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar dataKey="pendingCommission" name="Chủ Nhà Còn Nợ (Triệu đ)" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Landlord Brokerage KPI Highlights */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/80 dark:border-zinc-700/60">
                  <p className="text-[10px] text-slate-400 font-medium">Hoa hồng môi giới đã thu</p>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatVND(landlordSummary.totalCommissionRetained)}</p>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/80 dark:border-zinc-700/60">
                  <p className="text-[10px] text-slate-400 font-medium">Chủ nhà còn nợ hoa hồng</p>
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">{formatVND(landlordSummary.totalNetPayout)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2 Column Main Grid: Commission Engine vs Landlord Settlement */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Commission Engine & Payouts */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-amber-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Hoa Hồng Kinh Doanh Nhân Viên</h2>
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                {commissionPayouts.length} Bản ghi KPI
              </Badge>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {commissionPayouts.length > 0 ? (
                commissionPayouts.map((payout) => {
                  const comm = payout.commission_earned || 0;
                  const rev = payout.revenue_generated || 0;

                  return (
                    <div key={payout.id} className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-white">{payout.employee_name}</span>
                          <span className="text-[10px] text-slate-400 block">Kỳ: {payout.period || 'Hiện tại'} • Điểm: {payout.score || 0}đ</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          payout.status === 'approved' || payout.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {payout.status || 'Chờ tính toán'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-zinc-700/60">
                        <span className="text-slate-500">Doanh số: <strong className="text-slate-700 dark:text-slate-300">{formatVND(rev)}</strong></span>
                        <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">{formatVND(comm)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Chưa có dữ liệu hoa hồng nhân viên trong DB.
                </div>
              )}
            </div>

            <Button asChild className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-2">
              <Link href="/admin/commission-policies">Quản Lý Chính Sách & Chi Trả Hoa Hồng</Link>
            </Button>
          </div>

          {/* Landlord Payouts & Invoices */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-sky-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Đối Soát Hoa Hồng Từ Chủ Nhà</h2>
              </div>
              <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-bold">
                {landlordPayouts.length} Chủ nhà
              </Badge>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {landlordPayouts.length > 0 ? (
                landlordPayouts.map((lp) => (
                  <div key={lp.id} className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{lp.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                        {lp.properties_count || 0} BĐS
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Ngân hàng: {lp.bank_name || 'Chưa cập nhật'} • STK: {lp.bank_account_number || 'N/A'}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-zinc-700/60">
                      <span className="text-slate-400">Chủ tài khoản:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{lp.bank_account_owner || lp.name}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Chưa có thông tin tài khoản ngân hàng chủ nhà.
                </div>
              )}
            </div>

            <Button asChild variant="outline" className="w-full text-xs font-semibold">
              <Link href="/admin/services/invoices">Xem Hóa Đơn & Sổ Quỹ Thu Chi</Link>
            </Button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
