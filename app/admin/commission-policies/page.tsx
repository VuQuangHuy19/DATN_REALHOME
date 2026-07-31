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
} from 'lucide-react';
import { calculateCompanyRevenueAndSalesCommission } from '@/src/features/finance/services/commission';
import { useAuth } from '@/lib/auth/AuthContext';
import { getKPIConfiguration, saveKPIConfiguration } from '@/src/features/staff/services/kpi_configurations';
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

// Helper parse % nhập từ giao diện, loại bỏ số 0 ở đầu (ví dụ: 030 -> 30, 040 -> 40, 888 -> 100)
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

const inputNumberCleanClass = "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold font-mono text-center focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export default function CommissionPoliciesMainPage() {
  const { company } = useAuth();
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

  const [commissionTiers, setCommissionTiers] = useState<Array<{ minRevenue: number; maxRevenue: number; rate: number }>>([
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
          setFixedRatePercent(Math.round(((conf.sale_commission_fixed_rate ?? 0.6) * 100)));
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

  // Lưu toàn bộ cấu hình
  const handleSaveAllConfig = async () => {
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
        <span className="ml-3 font-semibold text-sm">Đang tải phân hệ Cơ chế & Hoa hồng...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 sm:p-6 space-y-8 transition-colors">
      {/* Header Phân hệ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
              Phân Hệ Quản Trị Cao Cấp
            </span>
            <span className="bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-200 dark:border-blue-500/20">
              True Home Real Estate SaaS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-2 text-slate-900 dark:text-white flex items-center gap-3">
            <Sliders className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
            Cơ Chế - Chính Sách Hoa Hồng & Lương Thưởng Sales
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Quản trị tập trung toàn bộ Thuật toán Hoa hồng Chủ nhà, Tỷ lệ chi trả Sales, Bậc thang Doanh số, Trọng số KPI và Bộ mô phỏng dòng tiền.
          </p>
        </div>

        <button
          onClick={handleSaveAllConfig}
          disabled={saving}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Lưu Toàn Bộ Cấu Hình
        </button>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-300 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium text-sm">Đã cập nhật hệ thống! Tất cả quy tắc hoa hồng, trọng số KPI và bảng doanh số đã sẵn sàng áp dụng.</span>
        </div>
      )}

      {/* Case Thực tế Phòng 501 Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/60 to-slate-50 dark:from-blue-950/60 dark:via-indigo-950/40 dark:to-slate-900 border border-blue-200 dark:border-blue-500/30 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm dark:shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 rounded-xl shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Hợp đồng thực tế mới nhất: Phòng 501 (Tòa 249 Yên Hòa)</h3>
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

      {/* LƯỚI CHÍNH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CỘT 1 & 2: CÁC KHỐI CẤU HÌNH */}
        <div className="lg:col-span-2 space-y-8">

          {/* KHỐI 1: Quy Tắc Thuật Toán Hoa Hồng Chủ Nhà */}
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 space-y-6 shadow-sm dark:shadow-xl transition-all">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Quy Tắc Thuật Toán Hoa Hồng Chủ Nhà (Landlord Engine)</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Cách xử lý tỷ lệ hoa hồng khi số tháng hợp đồng lẻ (ví dụ 9 tháng).</p>
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
                    ? 'bg-emerald-50 border-emerald-500 text-slate-900 shadow-sm dark:bg-emerald-500/15 dark:border-emerald-500 dark:text-white ring-1 ring-emerald-500'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-700/60 dark:text-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Nội suy tuyến tính</span>
                  <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  (Khuyên dùng) Tự động tính phần trăm chính xác theo thời hạn. <i>Ví dụ: 9 tháng giữa 6th (40%) và 12th (60%) = 50%.</i>
                </p>
              </button>

              <button
                type="button"
                onClick={() => setInterpolationMode('step')}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  interpolationMode === 'step'
                    ? 'bg-emerald-50 border-emerald-500 text-slate-900 shadow-sm dark:bg-emerald-500/15 dark:border-emerald-500 dark:text-white ring-1 ring-emerald-500'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-700/60 dark:text-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Bậc thang cố định</span>
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Làm tròn xuống mốc nhỏ hơn gần nhất. <i>Ví dụ: 9 tháng sẽ áp dụng mốc 6 tháng (40%).</i>
                </p>
              </button>

              <button
                type="button"
                onClick={() => setInterpolationMode('custom')}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  interpolationMode === 'custom'
                    ? 'bg-emerald-50 border-emerald-500 text-slate-900 shadow-sm dark:bg-emerald-500/15 dark:border-emerald-500 dark:text-white ring-1 ring-emerald-500'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-700/60 dark:text-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Bảng tùy biến riêng</span>
                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Cho phép nhập ma trận tỷ lệ riêng cho từng mốc (1, 3, 6, 9, 12, 18, 24 tháng).
                </p>
              </button>
            </div>

            {/* Edge Cases */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700/40">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Ngoại Lệ & Quy Tắc Phạt / Thưởng Nóng
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/50 cursor-pointer">
                  <div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-200 block">Phạt hoàn hoa hồng khi hủy sớm (Clawback)</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Thu hồi hoa hồng sale nếu khách phá hợp đồng trong 3 tháng đầu</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={clawbackEnabled}
                    onChange={(e) => setClawbackEnabled(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 dark:accent-emerald-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/50 cursor-pointer">
                  <div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-200 block">Thưởng chốt phòng tồn lâu</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Cộng thêm bonus cho phòng trống quá 30 ngày</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={vacancyBonusEnabled}
                    onChange={(e) => setVacancyBonusEnabled(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 dark:accent-emerald-500 rounded cursor-pointer"
                  />
                </label>
              </div>

              {vacancyBonusEnabled && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Số ngày trống tối thiểu để áp dụng bonus:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={vacancyDaysThreshold}
                        onChange={(e) => setVacancyDaysThreshold(parseIntegerInput(e.target.value))}
                        className={`w-full text-slate-900 dark:text-white ${inputNumberCleanClass}`}
                      />
                      <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">ngày</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">% Hoa hồng cộng thêm cho Sale:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={vacancyBonusPercent}
                        onChange={(e) => setVacancyBonusPercent(parsePercentInput(e.target.value))}
                        className={`w-full text-slate-900 dark:text-white ${inputNumberCleanClass}`}
                      />
                      <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KHỐI 2: Cơ Chế Hoa Hồng Chi Trả Cho Sale & Tỷ Lệ Theo Cấp Bậc */}
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 space-y-6 shadow-sm dark:shadow-xl transition-all">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Cơ Chế Hoa Hồng Chi Trả Cho Sale (Sales Commission Engine)</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Thiết lập tỷ lệ hưởng hoa hồng của Sale trên doanh thu công ty thu từ Chủ nhà.</p>
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 dark:text-indigo-400 dark:bg-indigo-500/10 dark:border-indigo-500/20 px-3 py-1 rounded-full">
                Toàn Công Ty
              </span>
            </div>

            {/* Chế độ hoa hồng Sale */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setSelectedCommMode('fixed')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedCommMode === 'fixed'
                    ? 'bg-blue-50 border-blue-500 text-slate-900 dark:bg-blue-500/15 dark:border-blue-500 dark:text-white shadow-sm ring-1 ring-blue-500'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-700/60 dark:text-slate-300 dark:hover:border-slate-600'
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
                    ? 'bg-amber-50 border-amber-500 text-slate-900 dark:bg-amber-500/15 dark:border-amber-500 dark:text-white shadow-sm ring-1 ring-amber-500'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-700/60 dark:text-slate-300 dark:hover:border-slate-600'
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
                    ? 'bg-purple-50 border-purple-500 text-slate-900 dark:bg-purple-500/15 dark:border-purple-500 dark:text-white shadow-sm ring-1 ring-purple-500'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-700/60 dark:text-slate-300 dark:hover:border-slate-600'
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

            {/* Bảng Quản lý Bậc thang Doanh số (Nấc Doanh Thu Tháng) */}
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
                        { minRevenue: lastMax, maxRevenue: lastMax + 30000000, rate: 0.65 }
                      ]);
                    }}
                    className="flex items-center gap-1.5 bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 text-xs px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-500/30 font-bold hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm mốc doanh số
                  </button>
                </div>

                <div className="space-y-2.5">
                  {commissionTiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200 dark:border-slate-700 text-xs flex-wrap shadow-xs">
                      <span className="font-bold text-amber-900 dark:text-amber-400 shrink-0 min-w-[55px]">Mốc {idx + 1}:</span>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold shrink-0">Từ:</span>
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
                          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold shrink-0">Đến:</span>
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
                          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold shrink-0">% Hưởng:</span>
                          <input
                            type="text"
                            value={Math.round(tier.rate * 100)}
                            onChange={(e) => {
                              const updated = [...commissionTiers];
                              updated[idx].rate = parsePercentInput(e.target.value) / 100;
                              setCommissionTiers(updated);
                            }}
                            className={`w-full text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/40 ${inputNumberCleanClass}`}
                          />
                          <span className="text-amber-800 dark:text-amber-400 font-bold">%</span>
                        </div>
                      </div>
                      {commissionTiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCommissionTiers(commissionTiers.filter((_, i) => i !== idx))}
                          className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bảng Tỷ lệ theo Cấp bậc Chuyên viên */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Tỷ Lệ Chia Hoa Hồng Theo Cấp Bậc Chuyên Viên
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <span className="text-xs text-slate-600 dark:text-slate-400 block font-semibold">1. Sale Tập Sự</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={salesTierRates.junior}
                      onChange={(e) => setSalesTierRates({ ...salesTierRates, junior: parsePercentInput(e.target.value) })}
                      className={`w-20 text-emerald-700 dark:text-emerald-400 text-lg ${inputNumberCleanClass}`}
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">%</span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <span className="text-xs text-slate-600 dark:text-slate-400 block font-semibold">2. Sale Chính Thức</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={salesTierRates.official}
                      onChange={(e) => setSalesTierRates({ ...salesTierRates, official: parsePercentInput(e.target.value) })}
                      className={`w-20 text-emerald-700 dark:text-emerald-400 text-lg ${inputNumberCleanClass}`}
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">%</span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <span className="text-xs text-slate-600 dark:text-slate-400 block font-semibold">3. Senior Sale</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={salesTierRates.senior}
                      onChange={(e) => setSalesTierRates({ ...salesTierRates, senior: parsePercentInput(e.target.value) })}
                      className={`w-20 text-emerald-700 dark:text-emerald-400 text-lg ${inputNumberCleanClass}`}
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">%</span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <span className="text-xs text-slate-600 dark:text-slate-400 block font-semibold">4. Team Leader</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={salesTierRates.teamLead}
                      onChange={(e) => setSalesTierRates({ ...salesTierRates, teamLead: parsePercentInput(e.target.value) })}
                      className={`w-20 text-emerald-700 dark:text-emerald-400 text-lg ${inputNumberCleanClass}`}
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quỹ Trưởng phòng / Team Lead Overriding */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-200 block">Hoa hồng Quản lý Trưởng nhóm (Overriding Commission)</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Trích % từ tổng hoa hồng công ty thu được do nhóm chốt</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={teamLeadOverrideRate}
                  onChange={(e) => setTeamLeadOverrideRate(parsePercentInput(e.target.value))}
                  className={`w-20 text-blue-700 dark:text-blue-400 ${inputNumberCleanClass}`}
                />
                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold">%</span>
              </div>
            </div>
          </div>

          {/* KHỐI 3: Trọng Số & Mục Tiêu KPI Mặc Định Hàng Tháng */}
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 space-y-6 shadow-sm dark:shadow-xl transition-all">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <Scale className="w-6 h-6 text-purple-600 dark:text-purple-400 shrink-0" />
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Cấu Hình Trọng Số & Mục Tiêu KPI Mặc Định Hàng Tháng</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Cơ cấu tính điểm KPI (Tổng trọng số = 100%) và chỉ tiêu định mức mặc định.</p>
                </div>
              </div>
            </div>

            {/* Trọng số KPI */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">⚖️ Trọng Số Đánh Giá KPI (Tổng = 100%)</h4>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${
                  revenueWeight + appointmentWeight + leadWeight === 100
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400'
                }`}>
                  Đang là: {revenueWeight + appointmentWeight + leadWeight}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block uppercase">1. Doanh thu (%)</label>
                  <input
                    type="text"
                    value={revenueWeight}
                    onChange={(e) => setRevenueWeight(parsePercentInput(e.target.value))}
                    className={`w-full text-emerald-700 dark:text-emerald-400 text-base ${inputNumberCleanClass}`}
                  />
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block uppercase">2. Lịch hẹn (%)</label>
                  <input
                    type="text"
                    value={appointmentWeight}
                    onChange={(e) => setAppointmentWeight(parsePercentInput(e.target.value))}
                    className={`w-full text-blue-700 dark:text-blue-400 text-base ${inputNumberCleanClass}`}
                  />
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block uppercase">3. Leads (%)</label>
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
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">🎯 Chỉ Tiêu Mục Tiêu Mặc Định Hàng Tháng</h4>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-4">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">Doanh thu mục tiêu (VNĐ):</label>
                  <input
                    type="text"
                    value={formatNumberWithDots(defaultTargetRevenue)}
                    onChange={(e) => setDefaultTargetRevenue(parseDotsToNumber(e.target.value))}
                    className={`w-full text-emerald-700 dark:text-emerald-400 text-base text-left ${inputNumberCleanClass}`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Mục tiêu số cuộc hẹn xem phòng:</label>
                    <input
                      type="text"
                      value={defaultTargetAppointments}
                      onChange={(e) => setDefaultTargetAppointments(parseIntegerInput(e.target.value))}
                      className={`w-full text-slate-900 dark:text-white ${inputNumberCleanClass}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Mục tiêu số Lead chốt thành công:</label>
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
          <div className="bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-950 border border-emerald-500/30 dark:border-emerald-500/40 rounded-2xl p-6 shadow-md dark:shadow-2xl space-y-6 sticky top-6">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700/60 pb-4">
              <Calculator className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Bộ Mô Phỏng Dòng Tiền Realtime</h2>
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

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">Thời hạn hợp đồng thực tế (tháng):</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={24}
                    value={simTermMonths}
                    onChange={(e) => setSimTermMonths(Number(e.target.value))}
                    className="w-full accent-emerald-600 dark:accent-emerald-500"
                  />
                  <span className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-1 rounded-lg text-emerald-700 dark:text-emerald-400 font-bold font-mono min-w-[55px] text-center shadow-xs">
                    {simTermMonths}th
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">Cấp bậc Sale chốt hợp đồng:</label>
                <select
                  value={simSalesLevel}
                  onChange={(e) => setSimSalesLevel(e.target.value as any)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white font-medium focus:border-emerald-500 focus:outline-none"
                >
                  <option value="junior">1. Sale Tập sự ({salesTierRates.junior}%)</option>
                  <option value="official">2. Sale Chính thức ({salesTierRates.official}%)</option>
                  <option value="senior">3. Senior Sale ({salesTierRates.senior}%)</option>
                  <option value="teamLead">4. Team Leader ({salesTierRates.teamLead}%)</option>
                </select>
              </div>
            </div>

            {/* MONEY BREAKDOWN DISPLAY */}
            <div className="bg-slate-100/90 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-inner">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
                <span>💰 Phân Rã Dòng Tiền Thu Nhập</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 lowercase">realtime</span>
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span>Tỷ lệ Chủ nhà trả:</span>
                  <span className="font-mono font-extrabold text-amber-700 dark:text-amber-400">{simResult.landlordRoseRate}</span>
                </div>

                <div className="flex justify-between items-center text-slate-900 dark:text-slate-200 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white">Doanh thu True Home thu:</span>
                  <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400 text-lg">
                    {formatMoney(simResult.companyRevenue)} đ
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Tỷ lệ chia Sale ({simSalesLevel}):</span>
                  <span className="font-mono text-blue-700 dark:text-blue-400 font-bold">{simResult.salesCommissionRate}</span>
                </div>

                <div className="flex justify-between items-center text-slate-900 dark:text-slate-200 bg-blue-50 dark:bg-blue-950/50 p-3 rounded-xl border border-blue-200 dark:border-blue-900/40">
                  <span className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Hoa hồng Sale nhận:
                  </span>
                  <span className="font-mono font-extrabold text-blue-700 dark:text-blue-400 text-lg">
                    {formatMoney(simResult.salesCommission)} đ
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="font-semibold text-slate-900 dark:text-slate-300">Lợi nhuận gộp Công ty:</span>
                  <span className="font-mono font-extrabold text-purple-700 dark:text-purple-400 text-base">
                    {formatMoney(simResult.companyNetProfit)} đ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
