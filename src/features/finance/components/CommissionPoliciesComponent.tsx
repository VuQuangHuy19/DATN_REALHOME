'use client';

import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Percent,
  Sliders,
  DollarSign,
  ShieldCheck,
  Building2,
  Users,
  Award,
  ArrowRight,
  Save,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  FileText,
  UserCheck,
  Zap,
  Sparkles,
  Check,
  Plus,
  Trash2,
  Target,
  Scale,
  Edit3,
  Calendar,
  AlertCircle,
  Loader2,
  Search,
  Lock,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Info,
} from 'lucide-react';
import {
  calculateCompanyRevenueAndSalesCommission,
  getContractTermMonths,
} from '@/features/finance/services/commission';
import { useAuth } from '@/lib/auth/AuthContext';
import { getKPIConfiguration, saveKPIConfiguration } from '@/features/staff/services/kpi_configurations';
import { getSalesDashboardStats } from '@/lib/supabase/repositories/dashboard';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

// Helper format định dạng dấu chấm phân cách hàng ngàn (xxx.xxx)
const formatNumberWithDots = (val: number): string => {
  if (isNaN(val) || val === null || val === undefined) return '0';
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Helper chuyển chuỗi định dạng xxx.xxx thành số thực
const parseDotsToNumber = (str: string): number => {
  const clean = str.replace(/\./g, '').replace(/,/g, '').replace(/[^\d]/g, '');
  return parseInt(clean, 10) || 0;
};

// Helper parse % nhập từ giao diện, loại bỏ số 0 ở đầu
const parsePercentInput = (val: string): number => {
  const clean = val.replace(/[^\d]/g, '');
  if (!clean) return 0;
  const num = parseInt(clean, 10);
  if (isNaN(num)) return 0;
  return Math.min(100, Math.max(0, num));
};

// Helper parse số nguyên số lượng/chỉ tiêu, loại bỏ số 0 ở đầu
const parseIntegerInput = (val: string, max: number = 999999): number => {
  const clean = val.replace(/[^\d]/g, '');
  if (!clean) return 0;
  const num = parseInt(clean, 10);
  if (isNaN(num)) return 0;
  return Math.min(max, Math.max(0, num));
};

const inputNumberCleanClass =
  'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold font-mono text-center focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

export function CommissionPoliciesComponent() {
  const { company, role, user, profile } = useAuth();
  const isSale = role === 'sales_agent' || profile?.role === 'sales_agent';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── State 1: Cấu hình Chính sách Hoa hồng Chủ nhà (Landlord Engine) ──────────
  const [interpolationMode, setInterpolationMode] = useState<'linear' | 'step' | 'custom'>('linear');
  const [clawbackEnabled, setClawbackEnabled] = useState(true);
  const [vacancyBonusEnabled, setVacancyBonusEnabled] = useState(true);
  const [vacancyDaysThreshold, setVacancyDaysThreshold] = useState(30);
  const [vacancyBonusPercent, setVacancyBonusPercent] = useState(10);

  // ── State 2: Cấu hình Cơ chế Hoa hồng Sale & Cấp bậc (Sales Commission) ──────
  const [selectedCommMode, setSelectedCommMode] = useState<'fixed' | 'tier' | 'custom'>('fixed');
  const [fixedRatePercent, setFixedRatePercent] = useState(60);

  const [salesTierRates, setSalesTierRates] = useState({
    junior: 50,
    official: 60,
    senior: 70,
    teamLead: 75,
  });

  const [commissionTiers, setCommissionTiers] = useState<
    Array<{ minRevenue: number; maxRevenue: number; rate: number }>
  >([
    { minRevenue: 0, maxRevenue: 30000000, rate: 0.35 },
    { minRevenue: 30000000, maxRevenue: 60000000, rate: 0.45 },
    { minRevenue: 60000000, maxRevenue: 100000000, rate: 0.55 },
  ]);

  const [teamLeadOverrideRate, setTeamLeadOverrideRate] = useState(5);

  // ── State 3: Trọng số & Mục tiêu KPI Mặc định (KPI Config) ─────────────────
  const [revenueWeight, setRevenueWeight] = useState(50);
  const [appointmentWeight, setAppointmentWeight] = useState(30);
  const [leadWeight, setLeadWeight] = useState(20);

  const [defaultTargetRevenue, setDefaultTargetRevenue] = useState(50000000);
  const [defaultTargetAppointments, setDefaultTargetAppointments] = useState(10);
  const [defaultTargetLeads, setDefaultTargetLeads] = useState(20);

  // ── State 4: Interactive Simulator / Calculator ────────────────────────────
  const [simRoomPrice, setSimRoomPrice] = useState<number>(5200000);
  const [simRoseStr, setSimRoseStr] = useState<string>('40% - 6th, 60% - 12th');
  const [simTermMonths, setSimTermMonths] = useState<number>(9);
  const [simSalesLevel, setSimSalesLevel] = useState<'junior' | 'official' | 'senior' | 'teamLead'>('official');

  // ── State 5: Sale Specific Data (Dành riêng cho Chế độ Sale Thuần Xem) ──────
  const [saleClosedDeals, setSaleClosedDeals] = useState<any[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string>('');
  const [dealSearchQuery, setDealSearchQuery] = useState<string>('');
  const [dealFilterTab, setDealFilterTab] = useState<'all' | 'deposit' | 'rental'>('all');
  const [saleKpiStats, setSaleKpiStats] = useState<any>(null);

  // Load KPI Configuration từ DB
  useEffect(() => {
    async function loadData() {
      if (!company?.id) {
        setLoading(false);
        return;
      }
      try {
        const conf = await getKPIConfiguration(company.id);
        if (conf) {
          setSelectedCommMode((conf.sale_commission_mode as any) || 'fixed');
          setFixedRatePercent(Math.round((conf.sale_commission_fixed_rate ?? 0.6) * 100));
          if (Array.isArray(conf.sale_commission_tiers) && conf.sale_commission_tiers.length > 0) {
            setCommissionTiers(conf.sale_commission_tiers);
          }
          setRevenueWeight(Math.round((conf.revenue_weight ?? 0.5) * 100));
          setAppointmentWeight(Math.round((conf.appointment_weight ?? 0.3) * 100));
          setLeadWeight(Math.round((conf.lead_weight ?? 0.2) * 100));

          setDefaultTargetRevenue(conf.default_target_revenue ?? 50000000);
          setDefaultTargetAppointments(conf.default_target_appointments ?? 10);
          setDefaultTargetLeads(conf.default_target_leads ?? 20);
        }
      } catch (err: any) {
        console.error('Error loading KPI config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [company?.id]);

  // Load Căn đã chốt & Điểm KPI cho Sale (Áp dụng Bộ lọc & Khử trùng lặp 4 trường hợp)
  useEffect(() => {
    async function loadSaleData() {
      const sId = user?.id || profile?.id;
      if (!company?.id || !sId || !isSale) return;
      try {
        const [stats, depRes, rentRes] = await Promise.all([
          getSalesDashboardStats(company.id, sId),
          supabase
            .from('deposit_contracts')
            .select(
              'id, contract_code, party_b_name, party_b_phone, deposit_amount, rent_price, created_at, status, room_id, rooms(code, price, rose, building_id, buildings(name))'
            )
            .eq('company_id', company.id)
            .or(`created_by.eq.${sId},sales_agent_id.eq.${sId}`)
            .order('created_at', { ascending: false }),
          supabase
            .from('rental_contracts')
            .select(
              'id, contract_code, deposit_contract_id, party_b_name, party_b_phone, rent_price, deposit_amount, start_date, end_date, created_at, status, room_id, rooms(code, price, rose, building_id, buildings(name))'
            )
            .eq('company_id', company.id)
            .or(`created_by.eq.${sId},sales_agent_id.eq.${sId}`)
            .order('created_at', { ascending: false }),
        ]);

        setSaleKpiStats(stats);

        // 1. Map danh sách Hợp đồng thuê chính thức
        const rentals = (rentRes.data || []).map((r: any) => {
          const termMonths = getContractTermMonths(r.start_date, r.end_date);
          return {
            ...r,
            type: 'rental',
            room_code: r.rooms?.code || '—',
            building_name: r.rooms?.buildings?.name || 'Tòa nhà',
            price: r.rent_price || r.rooms?.price || 0,
            rose: r.rooms?.rose || '40% - 6th, 60% - 12th',
            termMonths,
            statusLabel: 'HĐ THUÊ CHÍNH THỨC',
            statusColor:
              'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
          };
        });

        // 2. Thu thập danh sách ID hợp đồng cọc đã chuyển thành hợp đồng thuê
        const rentalDepositIds = new Set((rentRes.data || []).map((r: any) => r.deposit_contract_id).filter(Boolean));
        const rentalRoomCustomerKeys = new Set(
          rentals.map((r: any) => `${r.room_id}_${(r.party_b_name || '').toLowerCase().trim()}`)
        );

        // 3. Lọc & xử lý Hợp đồng Đặt cọc (Khử trùng lặp & Phân loại bỏ cọc / chờ ký)
        const deposits = (depRes.data || [])
          .filter((d: any) => {
            // CASE 1: Đã chuyển sang HĐ Thuê => Ẩn HĐ Cọc, chỉ hiển thị HĐ Thuê chính thức
            if (d.status === 'converted' || d.status === 'converted_to_rental') return false;
            if (rentalDepositIds.has(d.id)) return false;
            const key = `${d.room_id}_${(d.party_b_name || '').toLowerCase().trim()}`;
            if (rentalRoomCustomerKeys.has(key)) return false;

            return true;
          })
          .map((d: any) => {
            // CASE 2: Bỏ cọc / Hủy cọc
            const isCancelled =
              d.status === 'cancelled' || d.status === 'forfeited' || d.status === 'cancelled_deposit';

            return {
              ...d,
              type: 'deposit',
              room_code: d.rooms?.code || '—',
              building_name: d.rooms?.buildings?.name || 'Tòa nhà',
              price: d.rent_price || d.rooms?.price || 0,
              rose: d.rooms?.rose || '40% - 6th, 60% - 12th',
              termMonths: 12, // Thời hạn dự kiến trên HĐ cọc
              isCancelled,
              // CASE 3: Chưa ký HĐ thuê / Bỏ cọc
              statusLabel: isCancelled ? '🚫 BỎ CỌC (0 VNĐ)' : '📝 HĐ CỌC (CHỜ HĐ THUÊ)',
              statusColor: isCancelled
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
            };
          });

        const combined = [...rentals, ...deposits];
        setSaleClosedDeals(combined);
        if (combined.length > 0) {
          setSelectedDealId(combined[0].id);
        }
      } catch (err) {
        console.error('Error loading sale closed deals:', err);
      }
    }
    if (isSale) {
      loadSaleData();
    }
  }, [company?.id, user?.id, profile?.id, isSale]);

  // Dynamic active sales rate from tier or fixed mode
  const activeSalesRate = selectedCommMode === 'fixed' ? fixedRatePercent : salesTierRates[simSalesLevel];

  // Simulator Result
  const simResult = calculateCompanyRevenueAndSalesCommission(
    simRoomPrice,
    simRoseStr,
    simTermMonths,
    activeSalesRate
  );

  // Helper format số tiền VNĐ
  const formatMoney = (val: number) => val.toLocaleString('vi-VN');

  // Lọc căn đã chốt của Sale (Theo Tab Tất cả / Đã cọc / Đã thuê & Từ khóa tìm kiếm)
  const filteredClosedDeals = saleClosedDeals.filter((deal) => {
    if (dealFilterTab === 'deposit' && deal.type !== 'deposit') return false;
    if (dealFilterTab === 'rental' && deal.type !== 'rental') return false;

    if (!dealSearchQuery.trim()) return true;
    const q = dealSearchQuery.toLowerCase();
    return (
      (deal.room_code || '').toLowerCase().includes(q) ||
      (deal.building_name || '').toLowerCase().includes(q) ||
      (deal.party_b_name || '').toLowerCase().includes(q) ||
      (deal.contract_code || '').toLowerCase().includes(q)
    );
  });

  const activeDeal = saleClosedDeals.find((d) => d.id === selectedDealId) || filteredClosedDeals[0];

  // Tính hoa hồng căn được chọn (Xử lý trường hợp bỏ cọc = 0 VNĐ)
  const activeDealCalculation = activeDeal
    ? activeDeal.isCancelled
      ? {
          roomPrice: activeDeal.price,
          termMonths: activeDeal.termMonths || 12,
          landlordRoseRate: '0%',
          companyRevenue: 0,
          salesCommissionRate: '0%',
          salesCommission: 0,
          companyNetProfit: 0,
        }
      : calculateCompanyRevenueAndSalesCommission(
          activeDeal.price,
          activeDeal.rose,
          activeDeal.termMonths || 12,
          activeSalesRate
        )
    : null;

  // Lưu toàn bộ cấu hình (Chỉ dành cho Admin)
  const handleSaveAllConfig = async () => {
    if (isSale) {
      toast.error('Sale chỉ có quyền xem chính sách & kết quả hoa hồng cá nhân!');
      return;
    }
    setSaving(true);
    try {
      if (company?.id) {
        const payload = {
          revenue_weight: revenueWeight / 100,
          appointment_weight: appointmentWeight / 100,
          lead_weight: leadWeight / 100,
          default_target_revenue: defaultTargetRevenue,
          default_target_appointments: defaultTargetAppointments,
          default_target_leads: defaultTargetLeads,
          sale_commission_mode: selectedCommMode,
          sale_commission_fixed_rate: fixedRatePercent / 100,
          sale_commission_tiers: commissionTiers,
        };
        await saveKPIConfiguration(company.id, payload);
      }

      setSaveSuccess(true);
      toast.success('Đã lưu toàn bộ cơ chế, chính sách hoa hồng & KPI thành công!');
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      toast.error(`Lỗi khi lưu cấu hình: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white flex items-center justify-center p-8 rounded-2xl">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
        <span className="ml-3 font-semibold text-sm">Đang tải phân hệ Cơ chế & Hoa hồng...</span>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BẢNG DÀNH RIÊNG CHO SALE (THUẦN XEM - TRA CỨU HOAN HỒNG CĂN ĐÃ CHỐT & KPI)
  // ════════════════════════════════════════════════════════════════════════════
  if (isSale) {
    const kpiData = saleKpiStats?.employeeKpis || {};
    const actualRevenue = kpiData.revenue_generated || 0;
    const targetRevenue = kpiData.target_revenue || defaultTargetRevenue || 50000000;
    const revenueProgress = Math.min(100, Math.round((actualRevenue / (targetRevenue || 1)) * 100));

    const actualDeals = kpiData.successful_deals || saleClosedDeals.length;
    const targetDeals = defaultTargetLeads || 10;
    const dealsProgress = Math.min(100, Math.round((actualDeals / (targetDeals || 1)) * 100));

    const actualAppts = kpiData.total_appointments || saleKpiStats?.totalAppointments || 0;
    const targetAppts = defaultTargetAppointments || 10;
    const apptsProgress = Math.min(100, Math.round((actualAppts / (targetAppts || 1)) * 100));

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Banner Header Thuần Xem cho Sale */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-indigo-500/30">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <Calculator className="w-6 h-6 text-emerald-400" />
                Chính Sách Hoa Hồng & Tra Cứu KPI Cá Nhân
              </h2>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" /> Chỉ xem
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Tra cứu chính xác công thức tính hoa hồng cho các căn bạn đã chốt và theo dõi tiến độ đạt chỉ tiêu KPI hàng tháng.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 text-xs font-semibold flex items-center gap-2 shrink-0">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Mức % Hoa hồng đang áp dụng: <strong className="text-emerald-400 text-sm font-mono">{activeSalesRate}%</strong></span>
          </div>
        </div>

        {/* ── SECTION 1: BẢNG CHỈ TIÊU KPI & TIẾN ĐỘ CÁ NHÂN (VIEW-ONLY) ──────── */}
        <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-4">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  1. Định Mức Chỉ Tiêu KPI & Tiến Độ Tháng Này
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Xem mức độ hoàn thành chỉ tiêu doanh số hoa hồng, số căn chốt và số lịch hẹn dẫn khách.
                </p>
              </div>
            </div>
            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/30">
              {saleKpiStats?.kpiTier || 'Đồng (Level 1)'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* KPI 1: Doanh Số Hoa Hồng */}
            <div className="bg-slate-50 dark:bg-slate-900/70 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                   Doanh Số Hoa Hồng
                </span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {revenueProgress}%
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-base font-mono">
                    {formatMoney(actualRevenue)} đ
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    / {formatMoney(targetRevenue)} đ
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${revenueProgress}%` }}
                  />
                </div>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                <span>Trạng thái:</span>
                <span className={`font-bold ${revenueProgress >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {revenueProgress >= 100 ? '🔥 Đã đạt chỉ tiêu!' : `Còn thiếu ${formatMoney(Math.max(0, targetRevenue - actualRevenue))} đ`}
                </span>
              </div>
            </div>

            {/* KPI 2: Số Lượng Phòng Chốt */}
            <div className="bg-slate-50 dark:bg-slate-900/70 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  🏠 Số Căn Chốt Thành Công
                </span>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {dealsProgress}%
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-extrabold text-blue-700 dark:text-blue-400 text-base font-mono">
                    {actualDeals} căn
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    / {targetDeals} căn
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${dealsProgress}%` }}
                  />
                </div>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                <span>Đánh giá:</span>
                <span className={`font-bold ${dealsProgress >= 100 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  {dealsProgress >= 100 ? '🎉 Vượt chỉ tiêu!' : `Cần chốt thêm ${Math.max(0, targetDeals - actualDeals)} căn`}
                </span>
              </div>
            </div>

            {/* KPI 3: Lịch Hẹn Dẫn Khách */}
            <div className="bg-slate-50 dark:bg-slate-900/70 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  📅 Lịch Hẹn Dẫn Xem Phòng
                </span>
                <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                  {apptsProgress}%
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-extrabold text-purple-700 dark:text-purple-400 text-base font-mono">
                    {actualAppts} ca dẫn
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    / {targetAppts} ca
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${apptsProgress}%` }}
                  />
                </div>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                <span>Chăm sóc khách:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {actualAppts > 0 ? 'Đang hoạt động tốt' : 'Cần tăng cường đặt hẹn'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: TRA CỨU HOA HỒNG CĂN ĐÃ CHỐT CỦA TÔI ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cột trái: Chọn & Tìm căn đã chốt */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Căn Đã Chốt Của Tôi ({filteredClosedDeals.length})
                </h3>
              </div>
            </div>

            {/* Ô tìm kiếm */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={dealSearchQuery}
                onChange={(e) => setDealSearchQuery(e.target.value)}
                placeholder="Tìm mã phòng, tên tòa, tên khách..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Bộ lọc 3 Trạng thái: Tất cả (Mặc định) | Đã cọc | Đã thuê */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDealFilterTab('all')}
                className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer ${
                  dealFilterTab === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tất cả ({saleClosedDeals.length})
              </button>

              <button
                type="button"
                onClick={() => setDealFilterTab('deposit')}
                className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer ${
                  dealFilterTab === 'deposit'
                    ? 'bg-amber-500 text-white shadow-xs font-bold dark:bg-amber-600'
                    : 'text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
                }`}
              >
                Đã cọc ({saleClosedDeals.filter((d) => d.type === 'deposit').length})
              </button>

              <button
                type="button"
                onClick={() => setDealFilterTab('rental')}
                className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer ${
                  dealFilterTab === 'rental'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold dark:bg-emerald-600'
                    : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
              >
                Đã thuê ({saleClosedDeals.filter((d) => d.type === 'rental').length})
              </button>
            </div>

            {/* Danh sách căn (Tối đa 3 căn hiển thị, nhiều hơn cuộn xuống) */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {filteredClosedDeals.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Không tìm thấy căn nào đã chốt khớp từ khóa.
                </div>
              ) : (
                filteredClosedDeals.map((deal) => {
                  const isSelected = activeDeal?.id === deal.id;
                  return (
                    <button
                      key={deal.id}
                      type="button"
                      onClick={() => setSelectedDealId(deal.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 text-slate-900 dark:bg-emerald-500/15 dark:border-emerald-500 dark:text-white shadow-xs font-semibold'
                          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                          Phòng {deal.room_code}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${deal.statusColor}`}
                        >
                          {deal.statusLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">
                        {deal.building_name}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        <span>Khách: {deal.party_b_name || 'Khách hàng'}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatMoney(deal.price)} đ
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Cột phải: Phiếu chi tiết công thức & số tiền hoa hồng thực nhận */}
          <div className="lg:col-span-2 space-y-6">
            {activeDeal ? (
              <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      📌 Bảng Chi Tiết Tính Hoa Hồng Cho Căn Đã Chọn
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                      Phòng {activeDeal.room_code} — {activeDeal.building_name}
                    </h3>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold px-3 py-1 rounded-lg border ${activeDeal.statusColor}`}
                  >
                    {activeDeal.statusLabel}
                  </span>
                </div>

                {/* Chú thích thông minh theo 4 Trường hợp */}
                {activeDeal.isCancelled && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2.5 font-medium">
                    <XCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>
                      🚫 Khách đã hủy cọc / bỏ cọc. Theo quy định, hoa hồng thực nhận ghi nhận cho giao dịch này là <strong>0 VNĐ</strong>.
                    </span>
                  </div>
                )}

                {activeDeal.type === 'deposit' && !activeDeal.isCancelled && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs rounded-xl flex items-center gap-2.5 font-medium">
                    <Clock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      📝 Đây là Hợp Đồng Đặt Cọc. Hoa hồng bên dưới là mức tạm tính. Khi khách ký Hợp đồng thuê chính thức, hoa hồng sẽ tự động cập nhật chuẩn xác theo thời hạn HĐ thuê thực tế.
                    </span>
                  </div>
                )}

                {activeDeal.type === 'rental' && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2.5 font-medium">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      ✅ Hợp Đồng Thuê Chính Thức ({activeDeal.termMonths} tháng). Hoa hồng và doanh thu đã được chốt chuẩn xác theo thời hạn HĐ thuê thực tế ({activeDeal.termMonths} tháng).
                    </span>
                  </div>
                )}

                {/* Thông tin căn & Hợp đồng */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/50 text-xs">
                  <div>
                    <span className="text-slate-500 block">Khách hàng thuê:</span>
                    <strong className="text-slate-900 dark:text-white text-sm">
                      {activeDeal.party_b_name || 'Chưa rõ'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Giá thuê / tháng:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                      {formatMoney(activeDeal.price)} VNĐ
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Thời hạn hợp đồng:</span>
                    <strong className="text-slate-900 dark:text-white text-sm font-mono">
                      {activeDeal.termMonths} tháng
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Mốc hoa hồng Chủ nhà:</span>
                    <strong className="text-amber-600 dark:text-amber-400 text-xs font-mono">
                      {activeDeal.rose}
                    </strong>
                  </div>
                </div>

                {/* KẾT QUẢ TÍNH HOA HỒNG CHI TIẾT */}
                {activeDealCalculation && (
                  <div className="bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-slate-50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900 border border-emerald-300 dark:border-emerald-500/40 rounded-2xl p-6 space-y-5">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-emerald-200 dark:border-emerald-500/30 pb-3">
                      <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      Công Thức & Kết Quả Phân Rã Dòng Tiền Hoa Hồng
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                        <span className="text-slate-500 block">Tỷ lệ HH Chủ nhà áp dụng (Nội suy):</span>
                        <span className="text-amber-700 dark:text-amber-400 font-mono font-bold text-base">
                          {activeDealCalculation.landlordRoseRate}
                        </span>
                      </div>

                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                        <span className="text-slate-500 block">Tổng HH Công ty thu về:</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold text-base">
                          {formatMoney(activeDealCalculation.companyRevenue)} VNĐ
                        </span>
                      </div>

                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                        <span className="text-slate-500 block">Tỷ lệ chia Sale (% Mốc):</span>
                        <span className="text-blue-700 dark:text-blue-400 font-mono font-bold text-base">
                          {activeDealCalculation.salesCommissionRate}
                        </span>
                      </div>

                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                        <span className="text-slate-500 block">Lợi nhuận gộp Công ty giữ:</span>
                        <span className="text-purple-700 dark:text-purple-400 font-mono font-bold text-base">
                          {formatMoney(activeDealCalculation.companyNetProfit)} VNĐ
                        </span>
                      </div>
                    </div>

                    {/* HỘP NỔI BẬT SỐ TIỀN THỰC NHẬN */}
                    <div
                      className={`p-5 rounded-xl flex items-center justify-between shadow-md text-white ${
                        activeDeal.isCancelled ? 'bg-slate-700' : 'bg-emerald-600'
                      }`}
                    >
                      <div>
                        <span className="text-xs uppercase tracking-wider text-emerald-100 block font-semibold">
                          {activeDeal.isCancelled
                            ? '🚫 Hoa Hồng Ghi Nhận (Khách Bỏ Cọc):'
                            : '🎉 Hoa Hồng Sale Thực Nhận Cho Căn Này:'}
                        </span>
                        <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white mt-1 block">
                          {formatMoney(activeDealCalculation.salesCommission)} VNĐ
                        </span>
                      </div>
                      {activeDeal.isCancelled ? (
                        <XCircle className="w-10 h-10 text-rose-300 opacity-80 shrink-0" />
                      ) : (
                        <CheckCircle className="w-10 h-10 text-emerald-200 opacity-80 shrink-0" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Bạn chưa chọn căn nào hoặc chưa có căn chốt trong danh sách.
                </p>
              </div>
            )}

            {/* SECTION 3: MÔ PHỎNG TÍNH THỬ HOA HỒNG DÀNH CHO SALE */}
            <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 space-y-6 shadow-xs">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700/60 pb-3">
                <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Bộ Mô Phỏng Tính Thử Hoa Hồng Căn Mới (Realtime)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Nhập thử thông tin phòng định chào khách để tính trước hoa hồng bạn sẽ nhận được.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                    Giá phòng định chào (VNĐ):
                  </label>
                  <input
                    type="text"
                    value={formatNumberWithDots(simRoomPrice)}
                    onChange={(e) => setSimRoomPrice(parseDotsToNumber(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-emerald-600 font-bold font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                    Thời hạn dự kiến (Tháng):
                  </label>
                  <input
                    type="text"
                    value={simTermMonths}
                    onChange={(e) => setSimTermMonths(parseIntegerInput(e.target.value, 60))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                    Mốc hoa hồng Chủ nhà:
                  </label>
                  <input
                    type="text"
                    value={simRoseStr}
                    onChange={(e) => setSimRoseStr(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">Dự kiến hoa hồng Sale nhận:</span>
                  <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                    {formatMoney(simResult.salesCommission)} VNĐ
                  </span>
                </div>
                <div className="text-right text-slate-500">
                  <span>(Tỷ lệ HH Chủ nhà: {simResult.landlordRoseRate} ➔ Công ty thu: {formatMoney(simResult.companyRevenue)}đ)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BẢNG DÀNH CHO ADMIN / MANAGER (ĐẦY ĐỦ QUYỀN CHỈNH SỬA & LƯU CẤU HÌNH)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Action Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Cấu Hình Cơ Chế - Chính Sách Hoa Hồng & Lương Thưởng Sales
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quản trị tập trung toàn bộ Thuật toán Hoa hồng Chủ nhà, Tỷ lệ chi trả Sales, Bậc thang Doanh số, Trọng số KPI và Bộ mô phỏng dòng tiền.
          </p>
        </div>

        <button
          onClick={handleSaveAllConfig}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0 text-xs cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Lưu Cấu Hình
        </button>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-300 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-xs text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Đã cập nhật hệ thống! Tất cả quy tắc hoa hồng, trọng số KPI và bảng doanh số đã sẵn sàng áp dụng.</span>
        </div>
      )}

      {/* Case Thực tế Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/60 to-slate-50 dark:from-blue-950/60 dark:via-indigo-950/40 dark:to-slate-900 border border-blue-200 dark:border-blue-500/30 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 rounded-xl shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Hợp đồng thực tế mới nhất: Phòng 501 (Tòa 249 Yên Hòa)
              </h3>
              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded font-mono font-bold border border-emerald-200 dark:border-emerald-500/30">
                cquang398@gmail.com
              </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
              Giá phòng: <strong className="text-slate-900 dark:text-white">5.200.000đ/tháng</strong> | Thời hạn: <strong className="text-slate-900 dark:text-white">9 tháng</strong> | Mốc chủ nhà: <code className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-amber-900 dark:text-amber-300 font-mono font-semibold">40% - 6th, 60% - 12th</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-950/90 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 font-mono text-sm shrink-0 shadow-xs">
          <span className="text-slate-500 dark:text-slate-400">Nội suy 9th:</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-extrabold text-base">50%</span>
          <span className="text-slate-400">➔</span>
          <span className="text-amber-700 dark:text-amber-400 font-extrabold">2.600.000 VNĐ</span>
        </div>
      </div>

      {/* LƯỚI CHÍNH ADMIN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CỘT 1 & 2: CÁC KHỐI CẤU HÌNH ADMIN */}
        <div className="lg:col-span-2 space-y-8">
          {/* KHỐI 1: Quy Tắc Thuật Toán Hoa Hồng Chủ Nhà */}
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    1. Quy Tắc Thuật Toán Hoa Hồng Chủ Nhà (Landlord Engine)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cách xử lý tỷ lệ hoa hồng khi số tháng hợp đồng lẻ (ví dụ 9 tháng).
                  </p>
                </div>
              </div>
            </div>

            {/* Mode selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setInterpolationMode('linear')}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  interpolationMode === 'linear'
                    ? 'bg-emerald-50 border-emerald-500 text-slate-900 shadow-xs dark:bg-emerald-500/15 dark:border-emerald-500 dark:text-white ring-1 ring-emerald-500'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-700/60 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Nội suy tuyến tính</span>
                  <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  (Khuyên dùng) Tự động tính phần phần trăm chính xác theo thời hạn. <i>Ví dụ: 9 tháng = 50%.</i>
                </p>
              </button>

              <button
                type="button"
                onClick={() => setInterpolationMode('step')}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  interpolationMode === 'step'
                    ? 'bg-emerald-50 border-emerald-500 text-slate-900 shadow-xs dark:bg-emerald-500/15 dark:border-emerald-500 dark:text-white ring-1 ring-emerald-500'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-700/60 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Bậc thang cố định</span>
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Làm tròn xuống mốc nhỏ hơn gần nhất. <i>Ví dụ: 9 tháng áp dụng mốc 6 tháng (40%).</i>
                </p>
              </button>

              <button
                type="button"
                onClick={() => setInterpolationMode('custom')}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  interpolationMode === 'custom'
                    ? 'bg-emerald-50 border-emerald-500 text-slate-900 shadow-xs dark:bg-emerald-500/15 dark:border-emerald-500 dark:text-white ring-1 ring-emerald-500'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-700/60 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Bảng tùy biến riêng</span>
                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Cho phép nhập ma trận tỷ lệ riêng cho từng mốc (1, 3, 6, 9, 12 tháng).
                </p>
              </button>
            </div>
          </div>

          {/* KHỐI 2: Cơ Chế Hoa Hồng Chi Trả Cho Sale */}
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    2. Cơ Chế Hoa Hồng Chi Trả Cho Sale (Sales Commission Engine)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Thiết lập tỷ lệ hưởng hoa hồng của Sale trên doanh thu công ty thu từ Chủ nhà.
                  </p>
                </div>
              </div>
            </div>

            {/* Mode selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setSelectedCommMode('fixed')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedCommMode === 'fixed'
                    ? 'bg-blue-50 border-blue-500 text-slate-900 dark:bg-blue-500/15 dark:border-blue-500 dark:text-white shadow-xs ring-1 ring-blue-500'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-700/60 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">1. % Cố Định</span>
                  <Percent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tỷ lệ % hưởng cố định trên tổng hoa hồng thu từ Chủ nhà.
                </p>
                {selectedCommMode === 'fixed' && (
                  <div className="mt-3 pt-2 border-t border-blue-200 dark:border-blue-500/30 flex items-center gap-2">
                    <input
                      type="text"
                      value={fixedRatePercent}
                      onChange={(e) => setFixedRatePercent(parsePercentInput(e.target.value))}
                      className={`w-16 text-blue-700 dark:text-blue-400 ${inputNumberCleanClass}`}
                    />
                    <span className="text-xs font-bold text-blue-800 dark:text-blue-300">% doanh thu</span>
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedCommMode('tier')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedCommMode === 'tier'
                    ? 'bg-amber-50 border-amber-500 text-slate-900 dark:bg-amber-500/15 dark:border-amber-500 dark:text-white shadow-xs ring-1 ring-amber-500'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-700/60 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">2. Bậc Thang Doanh Số</span>
                  <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tăng % thưởng lũy tiến theo mốc doanh số chốt phòng trong tháng.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCommMode('custom')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedCommMode === 'custom'
                    ? 'bg-purple-50 border-purple-500 text-slate-900 dark:bg-purple-500/15 dark:border-purple-500 dark:text-white shadow-xs ring-1 ring-purple-500'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-700/60 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">3. Tùy Chỉnh Per-Deal</span>
                  <Edit3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Nhập tỷ lệ % linh hoạt khi Admin tạo từng hợp đồng.
                </p>
              </button>
            </div>

            {/* Bảng Quản lý Bậc thang Doanh số */}
            {selectedCommMode === 'tier' && (
              <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="font-bold text-sm text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Quản Lý Các Mốc Bậc Thang Doanh Số Tháng
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const lastMax = commissionTiers[commissionTiers.length - 1]?.maxRevenue || 30000000;
                      setCommissionTiers([
                        ...commissionTiers,
                        { minRevenue: lastMax, maxRevenue: lastMax + 30000000, rate: 0.65 },
                      ]);
                    }}
                    className="flex items-center gap-1.5 bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 text-xs px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-500/30 font-bold hover:bg-amber-200 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm mốc doanh số
                  </button>
                </div>

                <div className="space-y-2.5">
                  {commissionTiers.map((tier, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200 dark:border-slate-700 text-xs flex-wrap shadow-xs"
                    >
                      <span className="font-bold text-amber-900 dark:text-amber-400 shrink-0 min-w-[55px]">
                        Mốc {idx + 1}:
                      </span>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 text-[11px] font-semibold shrink-0">Từ:</span>
                          <input
                            type="text"
                            value={formatNumberWithDots(tier.minRevenue)}
                            onChange={(e) => {
                              const updated = [...commissionTiers];
                              updated[idx].minRevenue = parseDotsToNumber(e.target.value);
                              setCommissionTiers(updated);
                            }}
                            className={`w-full text-slate-900 dark:text-white ${inputNumberCleanClass}`}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 text-[11px] font-semibold shrink-0">Đến:</span>
                          <input
                            type="text"
                            value={formatNumberWithDots(tier.maxRevenue)}
                            onChange={(e) => {
                              const updated = [...commissionTiers];
                              updated[idx].maxRevenue = parseDotsToNumber(e.target.value);
                              setCommissionTiers(updated);
                            }}
                            className={`w-full text-slate-900 dark:text-white ${inputNumberCleanClass}`}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 text-[11px] font-semibold shrink-0">% Hưởng:</span>
                          <input
                            type="text"
                            value={Math.round(tier.rate * 100)}
                            onChange={(e) => {
                              const updated = [...commissionTiers];
                              updated[idx].rate = parsePercentInput(e.target.value) / 100;
                              setCommissionTiers(updated);
                            }}
                            className={`w-full text-amber-800 dark:text-amber-400 border-amber-300 ${inputNumberCleanClass}`}
                          />
                          <span className="text-amber-800 dark:text-amber-400 font-bold">%</span>
                        </div>
                      </div>
                      {commissionTiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCommissionTiers(commissionTiers.filter((_, i) => i !== idx))}
                          className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* KHỐI 3: Trọng Số & Mục Tiêu KPI Mặc Định */}
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <Scale className="w-6 h-6 text-purple-600 dark:text-purple-400 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    3. Cấu Hình Trọng Số & Mục Tiêu KPI Mặc Định Hàng Tháng
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cơ cấu tính điểm KPI (Tổng trọng số = 100%) và chỉ tiêu định mức mặc định.
                  </p>
                </div>
              </div>
            </div>

            {/* Trọng số KPI */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  ⚖️ Trọng Số Đánh Giá KPI (Tổng = 100%)
                </h4>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded ${
                    revenueWeight + appointmentWeight + leadWeight === 100
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400'
                  }`}
                >
                  Đang là: {revenueWeight + appointmentWeight + leadWeight}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block uppercase">
                    1. Doanh thu (%)
                  </label>
                  <input
                    type="text"
                    value={revenueWeight}
                    onChange={(e) => setRevenueWeight(parsePercentInput(e.target.value))}
                    className={`w-full text-emerald-700 dark:text-emerald-400 text-base ${inputNumberCleanClass}`}
                  />
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block uppercase">
                    2. Lịch hẹn (%)
                  </label>
                  <input
                    type="text"
                    value={appointmentWeight}
                    onChange={(e) => setAppointmentWeight(parsePercentInput(e.target.value))}
                    className={`w-full text-blue-700 dark:text-blue-400 text-base ${inputNumberCleanClass}`}
                  />
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block uppercase">
                    3. Leads (%)
                  </label>
                  <input
                    type="text"
                    value={leadWeight}
                    onChange={(e) => setLeadWeight(parsePercentInput(e.target.value))}
                    className={`w-full text-purple-700 dark:text-purple-400 text-base ${inputNumberCleanClass}`}
                  />
                </div>
              </div>
            </div>

            {/* Mục tiêu mặc định */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                🎯 Chỉ Tiêu Mục Tiêu Mặc Định Hàng Tháng
              </h4>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-4">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                    Doanh thu mục tiêu (VNĐ):
                  </label>
                  <input
                    type="text"
                    value={formatNumberWithDots(defaultTargetRevenue)}
                    onChange={(e) => setDefaultTargetRevenue(parseDotsToNumber(e.target.value))}
                    className={`w-full text-emerald-700 dark:text-emerald-400 text-base text-left ${inputNumberCleanClass}`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Mục tiêu số cuộc hẹn xem phòng:
                    </label>
                    <input
                      type="text"
                      value={defaultTargetAppointments}
                      onChange={(e) => setDefaultTargetAppointments(parseIntegerInput(e.target.value))}
                      className={`w-full text-slate-900 dark:text-white ${inputNumberCleanClass}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Mục tiêu số Lead chốt thành công:
                    </label>
                    <input
                      type="text"
                      value={defaultTargetLeads}
                      onChange={(e) => setDefaultTargetLeads(parseIntegerInput(e.target.value))}
                      className={`w-full text-slate-900 dark:text-white ${inputNumberCleanClass}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT 3: BỘ MÔ PHỎNG DÒNG TIỀN REALTIME SIMULATOR */}
        <div className="space-y-6">
          <div className="bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-950 border border-emerald-500/30 dark:border-emerald-500/40 rounded-2xl p-6 shadow-md space-y-6 sticky top-6">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700/60 pb-4">
              <Calculator className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bộ Mô Phỏng Dòng Tiền Realtime</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Nhập thử số liệu hợp đồng để xem ngay kết quả phân rã tiền.</p>
              </div>
            </div>

            {/* Input controls */}
            <div className="space-y-4 text-sm">
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">Giá thuê phòng / tháng (VNĐ):</label>
                <input
                  type="text"
                  value={formatNumberWithDots(simRoomPrice)}
                  onChange={(e) => setSimRoomPrice(parseDotsToNumber(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-emerald-700 dark:text-emerald-400 font-bold text-base focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">Chuỗi hoa hồng Chủ nhà (rose):</label>
                <input
                  type="text"
                  value={simRoseStr}
                  onChange={(e) => setSimRoseStr(e.target.value)}
                  placeholder="Ví dụ: 40% - 6th, 60% - 12th"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">Thời hạn HĐ:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={simTermMonths}
                      onChange={(e) => setSimTermMonths(parseIntegerInput(e.target.value, 60))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-center font-bold text-slate-900 dark:text-white text-sm"
                    />
                    <span className="text-xs font-semibold text-slate-500">tháng</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">Cấp bậc Sale:</label>
                  <select
                    value={simSalesLevel}
                    onChange={(e) => setSimSalesLevel(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="junior">Tập sự ({salesTierRates.junior}%)</option>
                    <option value="official">Chính thức ({salesTierRates.official}%)</option>
                    <option value="senior">Senior ({salesTierRates.senior}%)</option>
                    <option value="teamLead">Team Lead ({salesTierRates.teamLead}%)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Output Box */}
            <div className="bg-slate-100 dark:bg-slate-900/90 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                📊 Kết Quả Mô Phỏng Dòng Tiền
              </h4>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Tỷ lệ HH Chủ nhà áp dụng:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-sm">{simResult.landlordRoseRate}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Tổng HH công ty thu được:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-base">{formatMoney(simResult.companyRevenue)} đ</span>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Hoa hồng Sale nhận ({simResult.salesCommissionRate}):</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-sm">{formatMoney(simResult.salesCommission)} đ</span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-600 dark:text-slate-400">Lợi nhuận gộp công ty giữ:</span>
                <span className="font-extrabold text-purple-600 dark:text-purple-400 font-mono text-sm">{formatMoney(simResult.companyNetProfit)} đ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
