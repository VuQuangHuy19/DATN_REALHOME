'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Handshake,
  UserSearch,
  CalendarDays,
  FileText,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAdminModule } from '@/features/admin/context/admin-module-context';
import { ArrowLeft, BarChart3, AlertTriangle, Layers, Target, ShieldAlert, Sparkles, Filter } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  CartesianGrid,
} from 'recharts';

export function SalesDealFlowHub() {
  const { company } = useAuth();
  const { activeModule, setActiveModule } = useAdminModule();
  const companyId = company?.id;

  const [loading, setLoading] = useState(true);
  const [funnelStats, setFunnelStats] = useState({
    newLeads: 0,
    consulting: 0,
    scheduledAppointments: 0,
    deposited: 0,
    contractsSigned: 0,
    conversionRate: 0,
  });

  const [appointmentsList, setAppointmentsList] = useState<any[]>([]);
  const [contractsList, setContractsList] = useState<any[]>([]);
  const [trendTimeframe, setTrendTimeframe] = useState<'7days' | '30days'>('7days');
  const [trendSeries, setTrendSeries] = useState<any[]>([]);
  const [funnelChartData, setFunnelChartData] = useState<any[]>([]);
  const [bottleneckInfo, setBottleneckInfo] = useState<{ stage: string; dropRate: number; tip: string }>({
    stage: 'Tư Vấn -> Dẫn Xem Phòng',
    dropRate: 0,
    tip: 'Tăng cường gọi nhắc hẹn & gửi vị trí phòng rõ ràng cho khách trước giờ xem phòng.',
  });

  useEffect(() => {
    if (!companyId) return;

    async function fetchSalesData() {
      setLoading(true);
      try {
        // 1. Fetch Leads
        const { data: leadsData } = await supabase
          .from('leads')
          .select('id, status, created_at')
          .eq('company_id', companyId);

        const leads = leadsData || [];
        let newCount = 0;
        let consultingCount = 0;

        leads.forEach((l: any) => {
          const st = (l.status || '').toLowerCase();
          if (st === 'new' || st === 'chưa xử lý' || st === 'tiếp nhận') newCount++;
          else consultingCount++;
        });

        // 2. Fetch Appointments
        const { data: apptData } = await supabase
          .from('appointments')
          .select('id, customer_name, customer_phone, room_title, assigned_to_name, date, time, status, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        const appts = apptData || [];
        setAppointmentsList(appts.slice(0, 8));

        // 3. Fetch Deposit Contracts
        const { data: depData } = await supabase
          .from('deposit_contracts')
          .select('id, contract_code, party_b_name, deposit_amount, status, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        // 4. Fetch Rental Contracts
        const { data: renData } = await supabase
          .from('rental_contracts')
          .select('id, contract_code, party_b_name, rent_price, deposit_amount, status, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        const depCount = depData?.length || 0;
        const renCount = renData?.length || 0;

        // Combine contract lists for timeline display
        const combinedContracts = [
          ...(renData || []).map((c: any) => ({ ...c, type: 'rental' })),
          ...(depData || []).map((c: any) => ({ ...c, type: 'deposit' })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setContractsList(combinedContracts.slice(0, 6));

        const totalLeads = leads.length;
        const convRate = totalLeads > 0 ? Math.round((renCount / totalLeads) * 1000) / 10 : 0;

        const scheduledApptsCount = appts.length;

        setFunnelStats({
          newLeads: newCount || totalLeads,
          consulting: consultingCount,
          scheduledAppointments: scheduledApptsCount,
          deposited: depCount,
          contractsSigned: renCount,
          conversionRate: convRate,
        });

        // Compute Funnel Bar Chart Data 100% from DB
        const stage1 = newCount + consultingCount + scheduledApptsCount + depCount + renCount;
        const stage2 = consultingCount + scheduledApptsCount + depCount + renCount;
        const stage3 = scheduledApptsCount + depCount + renCount;
        const stage4 = depCount + renCount;
        const stage5 = renCount;

        const rate1to2 = stage1 > 0 ? Math.round((stage2 / stage1) * 100) : 0;
        const rate2to3 = stage2 > 0 ? Math.round((stage3 / stage2) * 100) : 0;
        const rate3to4 = stage3 > 0 ? Math.round((stage4 / stage3) * 100) : 0;
        const rate4to5 = stage4 > 0 ? Math.round((stage5 / stage4) * 100) : 0;

        setFunnelChartData([
          { stage: '1. Lead Mới', count: stage1, fill: '#3b82f6', retention: 100, drop: 0 },
          { stage: '2. Tư Vấn', count: stage2, fill: '#0284c7', retention: rate1to2, drop: Math.max(0, 100 - rate1to2) },
          { stage: '3. Xem Phòng', count: stage3, fill: '#f59e0b', retention: rate2to3, drop: Math.max(0, 100 - rate2to3) },
          { stage: '4. Đặt Cọc', count: stage4, fill: '#a855f7', retention: rate3to4, drop: Math.max(0, 100 - rate3to4) },
          { stage: '5. Ký Hợp Đồng', count: stage5, fill: '#10b981', retention: rate4to5, drop: Math.max(0, 100 - rate4to5) },
        ]);

        // Find Bottleneck stage
        const drops = [
          { stage: 'Lead Mới ➔ Tư Vấn', drop: Math.max(0, 100 - rate1to2), tip: 'Phản hồi tin nhắn/cuộc gọi của Lead trong vòng 5 phút đầu để tăng tỷ lệ kết nối.' },
          { stage: 'Tư Vấn ➔ Xem Phòng', drop: Math.max(0, 100 - rate2to3), tip: 'Gửi video/hình ảnh thực tế của phòng trọ để kích thích khách đặt lịch xem trực tiếp.' },
          { stage: 'Xem Phòng ➔ Đặt Cọc', drop: Math.max(0, 100 - rate3to4), tip: 'Tập trung tư vấn ưu đãi/giữ phòng tại chỗ khi đang dẫn khách xem trực tiếp.' },
          { stage: 'Đặt Cọc ➔ Ký Hợp Đồng', drop: Math.max(0, 100 - rate4to5), tip: 'Hỗ trợ khách làm hợp đồng online nhanh chóng để tránh hủy cọc.' },
        ];
        drops.sort((a, b) => b.drop - a.drop);
        setBottleneckInfo({
          stage: drops[0].stage,
          dropRate: drops[0].drop,
          tip: drops[0].tip,
        });

        // Compute 7-day and 30-day timeline series
        const now = new Date();
        const days7Data: any[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().slice(0, 10);
          const label = `${d.getDate()}/${d.getMonth() + 1}`;

          const leadsOnDay = leads.filter((l: any) => l.created_at?.slice(0, 10) === dateStr).length;
          const apptsOnDay = appts.filter((a: any) => (a.created_at?.slice(0, 10) === dateStr || a.date === dateStr)).length;
          const depsOnDay = (depData || []).filter((dp: any) => dp.created_at?.slice(0, 10) === dateStr);
          const rensOnDay = (rn: any) => rn.created_at?.slice(0, 10) === dateStr;
          const rensFiltered = (renData || []).filter(rensOnDay);

          const dealsCount = depsOnDay.length + rensFiltered.length;
          const rev = depsOnDay.reduce((s: number, c: any) => s + Number(c.deposit_amount || 0), 0) +
                      rensFiltered.reduce((s: number, c: any) => s + Number(c.rent_price || 0), 0);

          days7Data.push({
            date: label,
            leads: leadsOnDay,
            appointments: apptsOnDay,
            deals: dealsCount,
            revenue: Math.round((rev / 1000000) * 10) / 10,
          });
        }
        setTrendSeries(days7Data);

      } catch (err) {
        console.error('Lỗi khi tải dữ liệu phân hệ Bán hàng:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSalesData();
  }, [companyId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner Hub */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-600 p-6 text-white shadow-lg">
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
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-emerald-100 backdrop-blur-md mb-2">
              <Handshake className="h-3.5 w-3.5 text-emerald-300" />
              <span>Phân Hệ 2 • Bán Hàng & Quy Trình Giao Dịch</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Sales Pipeline & Deal Flow Hub</h1>
            <p className="text-sm text-emerald-100/90 mt-1 max-w-xl">
              Dữ liệu thực từ DB: Theo dõi phễu CRM khách hàng, quản lý lịch hẹn dẫn khách xem phòng và tiến trình chốt cọc / ký hợp đồng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold shadow-md">
              <Link href="/admin/customers/appointments">
                <CalendarDays className="h-4 w-4 mr-1.5" />
                Tạo Lịch Hẹn
              </Link>
            </Button>
            <Button asChild variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 font-semibold backdrop-blur-md">
              <Link href="/admin/contracts">
                <FileText className="h-4 w-4 mr-1.5" />
                Tạo Hợp Đồng
              </Link>
            </Button>
          </div>
        </div>

        {/* Dynamic Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <p className="text-xs text-emerald-200 font-medium">Khách Hàng CRM</p>
            <p className="text-xl font-bold mt-0.5">{funnelStats.newLeads + funnelStats.consulting} Leads</p>
            <p className="text-[11px] text-emerald-200 mt-1">Dữ liệu từ DB</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <p className="text-xs text-emerald-200 font-medium">Lịch Hẹn Xem Phòng</p>
            <p className="text-xl font-bold text-amber-300 mt-0.5">{funnelStats.scheduledAppointments} Lịch hẹn</p>
            <p className="text-[11px] text-emerald-200 mt-1">Lịch thực tế mới nhất</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <p className="text-xs text-emerald-200 font-medium">Phiếu Giữ Cọc</p>
            <p className="text-xl font-bold text-sky-300 mt-0.5">{funnelStats.deposited} Đặt cọc</p>
            <p className="text-[11px] text-emerald-200 mt-1">Hợp đồng cọc đã lập</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <p className="text-xs text-emerald-200 font-medium">Hợp Đồng Thuê Ký Mới</p>
            <p className="text-xl font-bold text-emerald-300 mt-0.5">{funnelStats.contractsSigned} Hợp đồng</p>
            <p className="text-[11px] text-emerald-300 mt-1 font-semibold">Tỷ lệ chốt: {funnelStats.conversionRate}%</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mr-2" />
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Đang tải dữ liệu Bán hàng & CRM...</span>
        </div>
      ) : (
        <>
          {/* CRM Funnel Overview Bar */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Phễu Chuyển Đổi Kinh Doanh Thực Tế (Sales Funnel)</h2>
              </div>
              <Link href="/admin/customers/leads" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
                Xem CRM Chi Tiết <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
              <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border-l-4 border-l-blue-500">
                <span className="text-xs text-slate-900 dark:text-slate-100 font-bold">1. Lead Mới</span>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{funnelStats.newLeads}</p>
                <span className="text-[10px] text-blue-600 font-semibold">Khách tiếp nhận</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border-l-4 border-l-sky-500">
                <span className="text-xs text-slate-900 dark:text-slate-100 font-bold">2. Đang Tư Vấn</span>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{funnelStats.consulting}</p>
                <span className="text-[10px] text-sky-600 font-semibold">Đang liên hệ</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border-l-4 border-l-amber-500">
                <span className="text-xs text-slate-900 dark:text-slate-100 font-bold">3. Xem Phòng</span>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{funnelStats.scheduledAppointments}</p>
                <span className="text-[10px] text-amber-600 font-semibold">Lịch dẫn khách</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border-l-4 border-l-purple-500">
                <span className="text-xs text-slate-900 dark:text-slate-100 font-bold">4. Đặt Cọc</span>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{funnelStats.deposited}</p>
                <span className="text-[10px] text-purple-600 font-semibold">Phiếu giữ cọc</span>
              </div>

              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border-l-4 border-l-emerald-500 col-span-2 sm:col-span-1">
                <span className="text-xs text-slate-900 dark:text-slate-100 font-bold">5. Ký Hợp Đồng</span>
                <p className="text-xl font-extrabold text-emerald-800 dark:text-emerald-200 mt-0.5">{funnelStats.contractsSigned}</p>
                <span className="text-[10px] text-emerald-600 font-extrabold">Hợp đồng thuê</span>
              </div>
            </div>
          </div>

          {/* Interactive Charts Section: 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Visual Funnel Conversion & Bottleneck Analysis */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Phân Tích Tỷ Lệ Chuyển Đổi & Điểm Nghẽn</h3>
                    <p className="text-xs text-slate-500">Mức độ rơi vãi khách qua từng giai đoạn phễu CRM</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold px-2.5 py-1">
                  Tỷ lệ chốt tổng: {funnelStats.conversionRate}%
                </Badge>
              </div>

              {/* Vertical Bar Chart simulating Funnel */}
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelChartData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis dataKey="stage" type="category" stroke="#475569" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} width={110} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
                              <p className="font-bold text-amber-300">{data.stage}</p>
                              <p>Số lượng: <strong className="text-white">{data.count}</strong> lượt</p>
                              <p>Tỷ lệ giữ chân từ bước trước: <strong className="text-emerald-400">{data.retention}%</strong></p>
                              {data.drop > 0 && (
                                <p className="text-rose-400">Tỷ lệ rơi vãi: <strong>{data.drop}%</strong></p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={22}>
                      {funnelChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Bottleneck Alert Box */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-900 dark:text-amber-200">Điểm nghẽn cần chú ý: {bottleneckInfo.stage}</span>
                    <Badge className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-extrabold px-1.5 py-0.2">
                      Rơi vãi {bottleneckInfo.dropRate}%
                    </Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    💡 <strong>Khuyên dùng:</strong> {bottleneckInfo.tip}
                  </p>
                </div>
              </div>
            </div>

            {/* Chart 2: Business Trend & Deal Flow Timeline */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Xu Hướng Kinh Doanh Theo Thời Gian</h3>
                    <p className="text-xs text-slate-500">So sánh Lead, Lịch xem phòng & Hợp đồng chốt thành công</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg">
                  <button
                    onClick={() => setTrendTimeframe('7days')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                      trendTimeframe === '7days' ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    7 ngày
                  </button>
                  <button
                    onClick={() => setTrendTimeframe('30days')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                      trendTimeframe === '30days' ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    30 ngày
                  </button>
                </div>
              </div>

              {/* Composed Chart combining Bar & Line */}
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendSeries} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#d97706" fontSize={11} tickLine={false} axisLine={false} unit="M" />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700">
                              <p className="font-bold text-emerald-400">Ngày {label}</p>
                              <div className="space-y-1">
                                <p className="text-blue-300">🔹 Lead mới: <strong>{payload.find((p: any) => p.dataKey === 'leads')?.value || 0}</strong></p>
                                <p className="text-amber-300">🔸 Lịch xem phòng: <strong>{payload.find((p: any) => p.dataKey === 'appointments')?.value || 0}</strong></p>
                                <p className="text-emerald-300">✅ Deal chốt: <strong>{payload.find((p: any) => p.dataKey === 'deals')?.value || 0}</strong></p>
                                <p className="text-amber-400">💰 Doanh số: <strong>{payload.find((p: any) => p.dataKey === 'revenue')?.value || 0} triệu đ</strong></p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar yAxisId="left" dataKey="leads" name="Lead Mới" fill="#60a5fa" radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar yAxisId="left" dataKey="appointments" name="Lịch Xem Phòng" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={14} />
                    <Line yAxisId="left" type="monotone" dataKey="deals" name="Hợp Đồng Chốt" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" name="Doanh Số (Triệu đ)" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Trend KPI Cards */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold">Tốc độ thu hút Lead</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      ~{Math.round((funnelStats.newLeads / 7) * 10) / 10} Lead / ngày
                    </p>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold">Hiệu suất dẫn khách</p>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {funnelStats.scheduledAppointments > 0
                        ? `${Math.round(((funnelStats.deposited + funnelStats.contractsSigned) / funnelStats.scheduledAppointments) * 100)}% chốt cọc`
                        : '0% chốt cọc'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2 Column Grid: Appointments Calendar vs Contracts Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Appointments & Sales Dắt Khách */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Lịch Hẹn Dắt Khách Gần Đây</h3>
                </div>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                  {appointmentsList.length} Lịch Hẹn
                </Badge>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {appointmentsList.length > 0 ? (
                  appointmentsList.map((item) => (
                    <div key={item.id} className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {item.customer_name} ({item.customer_phone || 'Chưa có SĐT'})
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                          {item.date ? `${item.date} ${item.time || ''}` : 'Mới tạo'}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{item.room_title || 'Xem phòng trọ'}</p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-zinc-700/60">
                        <span>Sales phụ trách: <strong className="text-slate-700 dark:text-slate-300">{item.assigned_to_name || 'Chưa phân công'}</strong></span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{item.status || 'Chờ xác nhận'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Chưa có lịch hẹn xem phòng nào.
                  </div>
                )}
              </div>

              <Button asChild variant="outline" className="w-full text-xs font-semibold">
                <Link href="/admin/customers/appointments">Xem Tất Cả Lịch Hẹn Dẫn Khách</Link>
              </Button>
            </div>

            {/* Contracts & Deposit Approvals */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Tiến Trình Cọc & Ký Hợp Đồng</h3>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                  {contractsList.length} Hợp Đồng
                </Badge>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {contractsList.length > 0 ? (
                  contractsList.map((contract) => {
                    const price = contract.rent_price || contract.deposit_amount || 0;
                    const formattedPrice = Number(price).toLocaleString('vi-VN');

                    return (
                      <div key={contract.id} className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{contract.contract_code}</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            contract.type === 'rental' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {contract.type === 'rental' ? 'HĐ Thuê' : 'HĐ Cọc'} ({contract.status || 'Hoạt động'})
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">{contract.party_b_name}</span>
                          <span className="font-bold text-emerald-600">{formattedPrice} đ</span>
                        </div>

                        <p className="text-[11px] text-slate-400">Tạo ngày {new Date(contract.created_at).toLocaleDateString('vi-VN')}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Chưa có hợp đồng nào được tạo trong DB.
                  </div>
                )}
              </div>

              <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2">
                <Link href="/admin/contracts">Quản Lý Danh Sách Hợp Đồng</Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
