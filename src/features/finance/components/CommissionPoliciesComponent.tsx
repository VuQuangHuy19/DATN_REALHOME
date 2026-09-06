'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calculator,
  Percent,
  Sliders,
  Building2,
  Users,
  Award,
  TrendingUp,
  FileText,
  UserCheck,
  Zap,
  Sparkles,
  Plus,
  Trash2,
  Target,
  Scale,
  Edit3,
  Loader2,
  Search,
  Lock,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  DollarSign,
  Gift,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import {
  calculateCompanyRevenueAndSalesCommission,
  getContractTermMonths,
} from '@/features/finance/services/commission';
import { useAuth } from '@/lib/auth/AuthContext';
import { getKPIConfiguration, saveKPIConfiguration } from '@/features/staff/services/kpi_configurations';
import { getSalesDashboardStats } from '@/lib/supabase/repositories/dashboard';
import { getSalaryBonuses, addSalaryBonus, deleteSalaryBonus, SalaryBonus } from '@/src/lib/supabase/repositories/salary_bonuses';
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
  const [autoSaving, setAutoSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── State 1: Cấu hình Chính sách Hoa hồng Chủ nhà (Landlord Engine) ──────────
  const [interpolationMode, setInterpolationMode] = useState<'linear' | 'step' | 'custom'>('linear');
  const [customMatrix, setCustomMatrix] = useState({
    m1: 10,
    m3: 25,
    m6: 40,
    m9: 50,
    m12: 60,
  });

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
    { minRevenue: 0, maxRevenue: 12500000, rate: 0.30 },
    { minRevenue: 12500000, maxRevenue: 25000000, rate: 0.34 },
    { minRevenue: 25000000, maxRevenue: 999999999, rate: 0.40 },
  ]);

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

  // ── State 5: Danh sách Hợp đồng Chốt trong tháng cho Mục 2 Case minh họa ────
  const [monthClosedDeals, setMonthClosedDeals] = useState<any[]>([]);
  const [selectedMonthDealId, setSelectedMonthDealId] = useState<string>('');

  // ── State 6: Quản lý Lương & Thưởng Sales (Khối 2) ──────────────────────────
  const [salesAgentsList, setSalesAgentsList] = useState<any[]>([]);
  const [selectedPayrollSaleId, setSelectedPayrollSaleId] = useState<string>('');
  const [saleBonuses, setSaleBonuses] = useState<SalaryBonus[]>([]);
  
  // Form Thêm Thưởng
  const [newBonusAmount, setNewBonusAmount] = useState<number>(500000);
  const [newBonusReason, setNewBonusReason] = useState<string>('Thưởng chốt deal căn Studio thành công');
  const [newBonusDate, setNewBonusDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [addingBonus, setAddingBonus] = useState(false);

  // ── State 7: Sale Specific Data (Dành riêng cho Chế độ Sale Thuần Xem) ──────
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

        // Fetch danh sách nhân viên Sales
        const { data: salesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, role')
          .eq('company_id', company.id)
          .eq('role', 'sales_agent');

        if (salesData && salesData.length > 0) {
          setSalesAgentsList(salesData);
          setSelectedPayrollSaleId(salesData[0].id);
        }

        // Fetch danh sách tất cả hợp đồng chốt trong công ty (cho Mục 2 Dropdown)
        const [depRes, rentRes] = await Promise.all([
          supabase
            .from('deposit_contracts')
            .select('id, contract_code, party_b_name, deposit_amount, rent_price, commission_rate_raw, created_at, status, room_id, rooms(code, price, rose, buildings(name))')
            .eq('company_id', company.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('rental_contracts')
            .select('id, contract_code, deposit_contract_id, party_b_name, rent_price, commission_rate_raw, start_date, end_date, created_at, status, room_id, rooms(code, price, rose, buildings(name))')
            .eq('company_id', company.id)
            .order('created_at', { ascending: false }),
        ]);

        const getRoseVal = (item: any) => {
          if (item.commission_rate_raw && typeof item.commission_rate_raw === 'string' && item.commission_rate_raw.trim()) {
            return item.commission_rate_raw.trim();
          }
          if (item.rooms?.rose && typeof item.rooms.rose === 'string' && item.rooms.rose.trim()) {
            return item.rooms.rose.trim();
          }
          return ''; // Để trống nếu chưa nhập % hoa hồng
        };

        const rentalList = (rentRes.data || [])
          .filter((r: any) => r.status !== 'cancelled')
          .map((r: any) => ({
            id: r.id,
            depositContractId: r.deposit_contract_id,
            roomId: r.room_id,
            code: r.rooms?.code || 'P.N/A',
            building: r.rooms?.buildings?.name || 'Tòa nhà',
            tenant: r.party_b_name || 'Khách hàng',
            price: r.rent_price || r.rooms?.price || 0,
            termMonths: getContractTermMonths(r.start_date, r.end_date) || 12,
            rose: getRoseVal(r),
            typeLabel: 'HĐ Thuê',
          }));

        const rentalDepositIds = new Set(rentalList.map((r: any) => r.depositContractId).filter(Boolean));
        const rentalRoomCustomerKeys = new Set(
          rentalList.map((r: any) => `${r.roomId}_${(r.tenant || '').toLowerCase().trim()}`)
        );

        const depositList = (depRes.data || [])
          .filter((d: any) => {
            if (d.status === 'converted' || d.status === 'converted_to_rental' || d.status === 'cancelled' || d.status === 'forfeited' || d.status === 'cancelled_deposit') return false;
            if (rentalDepositIds.has(d.id)) return false;
            const key = `${d.room_id}_${(d.party_b_name || '').toLowerCase().trim()}`;
            if (rentalRoomCustomerKeys.has(key)) return false;
            return true;
          })
          .map((d: any) => ({
            id: d.id,
            code: d.rooms?.code || 'P.N/A',
            building: d.rooms?.buildings?.name || 'Tòa nhà',
            tenant: d.party_b_name || 'Khách hàng',
            price: d.rent_price || d.rooms?.price || 0,
            termMonths: 12,
            rose: getRoseVal(d),
            typeLabel: 'HĐ Cọc',
          }));

        const allDeals = [...rentalList, ...depositList];
        setMonthClosedDeals(allDeals);
        if (allDeals.length > 0) {
          setSelectedMonthDealId(allDeals[0].id);
        }
      } catch (err: any) {
        console.error('Error loading KPI config & deals:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [company?.id]);

  // Tự động nhảy tiền & sync dữ liệu sang Bộ Mô Phỏng Dòng Tiền khi chọn phòng chốt
  useEffect(() => {
    if (!selectedMonthDealId || monthClosedDeals.length === 0) return;
    const deal = monthClosedDeals.find((d) => d.id === selectedMonthDealId);
    if (deal) {
      setSimRoomPrice(deal.price || 0);
      setSimTermMonths(deal.termMonths || 12);
      // Nếu hợp đồng/phòng chưa nhập % hoa hồng thì để trống ô này
      setSimRoseStr(deal.rose ? deal.rose : '');
    }
  }, [selectedMonthDealId, monthClosedDeals]);

  // Fetch danh sách Tiền Thưởng khi đổi Sale chọn
  useEffect(() => {
    async function loadBonuses() {
      if (!company?.id || !selectedPayrollSaleId) return;
      const bonuses = await getSalaryBonuses(company.id, selectedPayrollSaleId);
      setSaleBonuses(bonuses);
    }
    loadBonuses();
  }, [company?.id, selectedPayrollSaleId]);

  // Load Căn đã chốt cho Sale (Dành riêng cho Chế độ Sale)
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

        const rentalDepositIds = new Set((rentRes.data || []).map((r: any) => r.deposit_contract_id).filter(Boolean));
        const rentalRoomCustomerKeys = new Set(
          rentals.map((r: any) => `${r.room_id}_${(r.party_b_name || '').toLowerCase().trim()}`)
        );

        const deposits = (depRes.data || [])
          .filter((d: any) => {
            if (d.status === 'converted' || d.status === 'converted_to_rental') return false;
            if (rentalDepositIds.has(d.id)) return false;
            const key = `${d.room_id}_${(d.party_b_name || '').toLowerCase().trim()}`;
            if (rentalRoomCustomerKeys.has(key)) return false;
            return true;
          })
          .map((d: any) => {
            const isCancelled =
              d.status === 'cancelled' || d.status === 'forfeited' || d.status === 'cancelled_deposit';

            return {
              ...d,
              type: 'deposit',
              room_code: d.rooms?.code || '—',
              building_name: d.rooms?.buildings?.name || 'Tòa nhà',
              price: d.rent_price || d.rooms?.price || 0,
              rose: d.rooms?.rose || '40% - 6th, 60% - 12th',
              termMonths: 12,
              isCancelled,
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

  // Tự động lưu cấu hình (Auto-Save) khi Admin thay đổi các chỉ số
  const handleAutoSave = useCallback(
    async (overrideData?: any) => {
      if (isSale || !company?.id) return;
      setAutoSaving(true);
      try {
        const payload = overrideData || {
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
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err: any) {
        console.error('Auto-save KPI config error:', err);
      } finally {
        setAutoSaving(false);
      }
    },
    [company?.id, isSale, revenueWeight, appointmentWeight, leadWeight, defaultTargetRevenue, defaultTargetAppointments, defaultTargetLeads, selectedCommMode, fixedRatePercent, commissionTiers]
  );

  // ⚡ Nút Khôi Phục Mặc Định (Reset to Default)
  const handleResetToDefault = async () => {
    if (isSale) return;
    const defaultPayload = {
      revenue_weight: 0.5,
      appointment_weight: 0.3,
      lead_weight: 0.2,
      default_target_revenue: 50000000,
      default_target_appointments: 10,
      default_target_leads: 20,
      sale_commission_mode: 'fixed',
      sale_commission_fixed_rate: 0.6,
      sale_commission_tiers: [
        { minRevenue: 0, maxRevenue: 12500000, rate: 0.30 },
        { minRevenue: 12500000, maxRevenue: 25000000, rate: 0.34 },
        { minRevenue: 25000000, maxRevenue: 999999999, rate: 0.40 },
      ],
    };

    setInterpolationMode('linear');
    setCustomMatrix({ m1: 10, m3: 25, m6: 40, m9: 50, m12: 60 });
    setSelectedCommMode('fixed');
    setFixedRatePercent(60);
    setCommissionTiers(defaultPayload.sale_commission_tiers);
    setRevenueWeight(50);
    setAppointmentWeight(30);
    setLeadWeight(20);
    setDefaultTargetRevenue(50000000);
    setDefaultTargetAppointments(10);
    setDefaultTargetLeads(20);

    await handleAutoSave(defaultPayload);
    toast.success('✨ Đã khôi phục toàn bộ cài đặt mặc định ban đầu thành công!');
  };

  // Thêm Khoản Thưởng cho Sale (Khối 2)
  const handleAddBonusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id || !selectedPayrollSaleId) return;
    if (newBonusAmount <= 0) {
      toast.error('Vui lòng nhập số tiền thưởng hợp lệ');
      return;
    }
    setAddingBonus(true);
    try {
      const added = await addSalaryBonus({
        company_id: company.id,
        sales_agent_id: selectedPayrollSaleId,
        amount: newBonusAmount,
        reason: newBonusReason || 'Khen thưởng thành tích xuất sắc',
        bonus_date: newBonusDate,
      });
      setSaleBonuses(prev => [added, ...prev]);
      setNewBonusAmount(500000);
      setNewBonusReason('');
      toast.success('✨ Đã thêm khoản tiền thưởng mới cho Sale thành công!');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi thêm tiền thưởng');
    } finally {
      setAddingBonus(false);
    }
  };

  // Xóa Khoản Thưởng (Khối 2)
  const handleDeleteBonusItem = async (id: string) => {
    await deleteSalaryBonus(id);
    setSaleBonuses(prev => prev.filter(b => b.id !== id));
    toast.success('Đã xóa khoản thưởng');
  };

  // Dynamic active sales rate from tier or fixed mode
  const activeSalesRate = selectedCommMode === 'fixed' ? fixedRatePercent : salesTierRates[simSalesLevel];

  // Simulator Result
  const simResult = calculateCompanyRevenueAndSalesCommission(
    simRoomPrice,
    simRoseStr,
    simTermMonths,
    activeSalesRate
  );

  // Active Selected Deal trong Mục 2 minh họa
  const activeSelectedMonthDeal = monthClosedDeals.find(d => d.id === selectedMonthDealId) || monthClosedDeals[0] || {
    code: '501',
    building: 'Tòa 249 Yên Hòa',
    tenant: 'Nguyễn Văn A',
    price: 5200000,
    termMonths: 9,
    rose: '40% - 6th, 60% - 12th',
  };

  const activeDealSimResult = calculateCompanyRevenueAndSalesCommission(
    activeSelectedMonthDeal.price,
    activeSelectedMonthDeal.rose,
    activeSelectedMonthDeal.termMonths,
    activeSalesRate
  );

  const formatMoney = (val: number) => val.toLocaleString('vi-VN');

  // Lọc căn đã chốt của Sale (Dành riêng cho Chế độ Sale)
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

  // Tính tổng thưởng & lương của Sale được chọn trong Khối 2
  const selectedSaleAgentInfo = salesAgentsList.find(s => s.id === selectedPayrollSaleId);
  const totalBonusSum = saleBonuses.reduce((sum, item) => sum + item.amount, 0);
  const calculatedBaseCommission = 2600000 * 0.6; // Giả lập hoa hồng từ căn chốt
  const totalPayrollAmount = calculatedBaseCommission + totalBonusSum;

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
                Chính Sách Hoa Hồng &amp; Tra Cứu KPI Cá Nhân
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
                  1. Định Mức Chỉ Tiêu KPI &amp; Tiến Độ Tháng Này
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
            </div>
          </div>
        </div>

        {/* ── SECTION 2: TRA CỨU HOA HỒNG CĂN ĐÃ CHỐT CỦA TÔI ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Căn Đã Chốt Của Tôi ({filteredClosedDeals.length})
                </h3>
              </div>
            </div>

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

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {filteredClosedDeals.map((deal) => (
                <button
                  key={deal.id}
                  type="button"
                  onClick={() => setSelectedDealId(deal.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    activeDeal?.id === deal.id
                      ? 'bg-emerald-50 border-emerald-500 text-slate-900 dark:bg-emerald-500/15 dark:border-emerald-500 dark:text-white shadow-xs font-semibold'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                      Phòng {deal.room_code}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${deal.statusColor}`}>
                      {deal.statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">
                    {deal.building_name}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {activeDeal && activeDealCalculation && (
              <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 space-y-6 shadow-xs">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Phòng {activeDeal.room_code} — {activeDeal.building_name}
                </h3>
                <div className="p-5 bg-emerald-600 rounded-xl flex items-center justify-between text-white shadow-md">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-emerald-100 block font-semibold">
                      🎉 Hoa Hồng Sale Thực Nhận:
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white mt-1 block">
                      {formatMoney(activeDealCalculation.salesCommission)} VNĐ
                    </span>
                  </div>
                  <CheckCircle className="w-10 h-10 text-emerald-200 opacity-80 shrink-0" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BẢNG DÀNH CHO ADMIN / MANAGER (TỰ ĐỘNG LƯU & KHÔI PHỤC MẶC ĐỊNH)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1️⃣ Action Header Banner (Nút Khôi phục mặc định + Auto-save badge) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Cấu Hình Cơ Chế - Chính Sách Hoa Hồng &amp; Lương Thưởng Sales
            </h2>
            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-emerald-300">
              ⚡ Tự động lưu tức thì
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quản trị tập trung toàn bộ Thuật toán Hoa hồng Chủ nhà, Tỷ lệ chi trả Sales, Bậc thang Doanh số, Trọng số KPI và Bảng Lương Thưởng.
          </p>
        </div>

        <button
          onClick={handleResetToDefault}
          className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 shrink-0 text-xs cursor-pointer border border-slate-300 dark:border-slate-600"
          title="Khôi phục toàn bộ giá trị cài đặt về mặc định ban đầu"
        >
          <RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          <span>Khôi phục mặc định</span>
        </button>
      </div>

      {/* 2️⃣ Case Hợp Đồng Minh Họa (Closed Deals Dropdown Selector) */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/60 to-slate-50 dark:from-blue-950/60 dark:via-indigo-950/40 dark:to-slate-900 border border-blue-200 dark:border-blue-500/30 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-4 flex-1">
          <div className="p-3 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 rounded-xl shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 w-full">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                Ví dụ Hợp đồng Thực tế Minh họa:
              </h3>
              {/* Dropdown Selector chọn căn trong tháng */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Chọn phòng chốt trong tháng:</span>
                <select
                  value={selectedMonthDealId}
                  onChange={(e) => setSelectedMonthDealId(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white shadow-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {monthClosedDeals.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.typeLabel}] Phòng {d.code} - {d.building} ({formatMoney(d.price)}đ)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Khách hàng: <strong className="text-slate-900 dark:text-white">{activeSelectedMonthDeal.tenant}</strong> | Giá phòng: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{formatMoney(activeSelectedMonthDeal.price)}đ/tháng</strong> | Thời hạn: <strong className="text-slate-900 dark:text-white">{activeSelectedMonthDeal.termMonths} tháng</strong> | Mốc chủ nhà: <code className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-amber-900 dark:text-amber-300 font-mono font-semibold">{activeSelectedMonthDeal.rose || 'Chưa nhập % hoa hồng'}</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-950/90 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 font-mono text-sm shrink-0 shadow-xs">
          <span className="text-slate-500 dark:text-slate-400">HH Chủ nhà ({activeSelectedMonthDeal.termMonths}th):</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-extrabold text-base">{activeDealSimResult.landlordRoseRate}</span>
          <span className="text-slate-400">➔</span>
          <span className="text-amber-700 dark:text-amber-400 font-extrabold">{formatMoney(activeDealSimResult.companyRevenue)} VNĐ</span>
        </div>
      </div>

      {/* LƯỚI CHÍNH ADMIN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CỘT 1 & 2: CÁC KHỐI CẤU HÌNH ADMIN */}
        <div className="lg:col-span-2 space-y-8">
          {/* KHỐI 1: Quy Tắc Thuật Toán Hoa Hồng Chủ Nhà (Landlord Engine + Custom Matrix) */}
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    1. Quy Tắc Thuật Toán Hoa Hồng Chủ Nhà (Landlord Engine)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cách xử lý tỷ lệ hoa hồng khi số tháng hợp đồng lẻ (ví dụ 9 tháng hoặc 4 tháng).
                  </p>
                </div>
              </div>
            </div>

            {/* Mode selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => {
                  setInterpolationMode('linear');
                  handleAutoSave({ ...getKPIPayload(), interpolation_mode: 'linear' });
                }}
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
                  (Khuyên dùng) Tự động tính % chính xác theo đường thẳng. <i>Ví dụ: 9 tháng = 50%.</i>
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInterpolationMode('step');
                  handleAutoSave({ ...getKPIPayload(), interpolation_mode: 'step' });
                }}
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
                onClick={() => {
                  setInterpolationMode('custom');
                  handleAutoSave({ ...getKPIPayload(), interpolation_mode: 'custom' });
                }}
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

            {/* BẢNG MA TRẬN TÙY BIẾN RIỆNG (Hiển thị khi chọn Option 3) */}
            {interpolationMode === 'custom' && (
              <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-500/40 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-purple-900 dark:text-purple-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Ma Trận Tỷ Lệ Hoa Hồng % Theo Số Tháng Hợp Đồng
                  </h4>
                  <span className="text-xs text-purple-700 dark:text-purple-300 font-semibold">Tự động áp dụng</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                  {[
                    { key: 'm1', label: '1 Tháng', val: customMatrix.m1 },
                    { key: 'm3', label: '3 Tháng', val: customMatrix.m3 },
                    { key: 'm6', label: '6 Tháng', val: customMatrix.m6 },
                    { key: 'm9', label: '9 Tháng', val: customMatrix.m9 },
                    { key: 'm12', label: '12 Tháng', val: customMatrix.m12 },
                  ].map((item) => (
                    <div key={item.key} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-purple-200 dark:border-slate-700 space-y-1 text-center shadow-xs">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">{item.label}</span>
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="text"
                          value={item.val}
                          onChange={(e) => {
                            const newM = { ...customMatrix, [item.key]: parsePercentInput(e.target.value) };
                            setCustomMatrix(newM);
                          }}
                          className={`w-16 text-purple-700 dark:text-purple-400 ${inputNumberCleanClass}`}
                        />
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-400">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* KHỐI 2: Cơ Chế Hoa Hồng & BẢNG TÍNH LƯƠNG + TIỀN THƯỞNG SALES */}
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    2. Cơ Chế Hoa Hồng &amp; Tính Lương + Tiền Thưởng Sales
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cấu hình chế độ hoa hồng và quản lý bảng tính lương, tiền thưởng hàng tháng cho từng Sales.
                  </p>
                </div>
              </div>
            </div>

            {/* Mode selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedCommMode('fixed');
                  handleAutoSave({ ...getKPIPayload(), sale_commission_mode: 'fixed' });
                }}
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
                      onChange={(e) => {
                        const val = parsePercentInput(e.target.value);
                        setFixedRatePercent(val);
                        handleAutoSave({ ...getKPIPayload(), sale_commission_fixed_rate: val / 100 });
                      }}
                      className={`w-16 text-blue-700 dark:text-blue-400 ${inputNumberCleanClass}`}
                    />
                    <span className="text-xs font-bold text-blue-800 dark:text-blue-300">% doanh thu</span>
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCommMode('tier');
                  handleAutoSave({ ...getKPIPayload(), sale_commission_mode: 'tier' });
                }}
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
                onClick={() => {
                  setSelectedCommMode('custom');
                  handleAutoSave({ ...getKPIPayload(), sale_commission_mode: 'custom' });
                }}
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

            {/* BỘ CHỌN SALE & BẢNG TÍNH LƯƠNG + QUẢN LÝ TIỀN THƯỞNG */}
            <div className="p-5 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 dark:from-slate-900 dark:to-slate-900 rounded-2xl border border-blue-200 dark:border-slate-700 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-200/80 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Bảng Tính Lương &amp; Quản Lý Tiền Thưởng Nhân Viên
                  </h4>
                </div>
                
                {/* Sale Dropdown Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Chọn Nhân Viên Sales:</span>
                  <select
                    value={selectedPayrollSaleId}
                    onChange={(e) => setSelectedPayrollSaleId(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white shadow-xs focus:outline-none focus:border-emerald-500"
                  >
                    {salesAgentsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        👤 {s.full_name || s.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Thông tin Lương tổng hợp của Sale được chọn */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-slate-500 block">Hoa Hồng Phòng Chốt (60%):</span>
                  <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                    {formatMoney(calculatedBaseCommission)} đ
                  </span>
                </div>
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-slate-500 block">Tổng Tiền Thưởng Thêm:</span>
                  <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                    + {formatMoney(totalBonusSum)} đ
                  </span>
                </div>
                <div className="p-3.5 bg-emerald-600 rounded-xl text-white space-y-1 shadow-md">
                  <span className="text-emerald-100 block uppercase font-bold text-[10px]">TỔNG THU NHẬP SALE THỰC NHẬN:</span>
                  <span className="text-lg sm:text-xl font-black font-mono">
                    {formatMoney(totalPayrollAmount)} VNĐ
                  </span>
                </div>
              </div>

              {/* BẢNG QUẢN LÝ TIỀN THƯỞNG (BONUS TABLE) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-amber-500" /> Bảng Ghi Nhận Tiền Thưởng Thêm (Bonus List)
                  </h5>
                </div>

                {/* Form Thêm Tiền Thưởng Mới */}
                <form onSubmit={handleAddBonusSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Số tiền thưởng (VNĐ)</label>
                    <input
                      type="text"
                      value={formatNumberWithDots(newBonusAmount)}
                      onChange={(e) => setNewBonusAmount(parseDotsToNumber(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-bold font-mono text-emerald-600"
                    />
                  </div>
                  <div className="sm:col-span-5 space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Nội dung / Lý do thưởng</label>
                    <input
                      type="text"
                      value={newBonusReason}
                      onChange={(e) => setNewBonusReason(e.target.value)}
                      placeholder="VD: Thưởng chốt deal vượt KPI..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Ngày thưởng</label>
                    <input
                      type="date"
                      value={newBonusDate}
                      onChange={(e) => setNewBonusDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="submit"
                      disabled={addingBonus}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 rounded-lg shadow-xs flex items-center justify-center gap-1 text-xs cursor-pointer"
                    >
                      {addingBonus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>Thêm thưởng</span>
                    </button>
                  </div>
                </form>

                {/* Danh sách thưởng */}
                <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 text-center w-12">STT</th>
                        <th className="p-2.5 font-mono">Số Tiền Thưởng</th>
                        <th className="p-2.5">Nội Dung / Lý Do</th>
                        <th className="p-2.5 font-mono">Ngày Thưởng</th>
                        <th className="p-2.5 text-center w-16">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {saleBonuses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                            Chưa có khoản tiền thưởng nào được ghi nhận cho nhân viên này.
                          </td>
                        </tr>
                      ) : (
                        saleBonuses.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                            <td className="p-2.5 font-extrabold text-amber-600 font-mono">+ {formatMoney(item.amount)} đ</td>
                            <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">{item.reason}</td>
                            <td className="p-2.5 text-slate-500 font-mono">{item.bonus_date}</td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteBonusItem(item.id)}
                                className="p-1 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                                title="Xóa khoản thưởng"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* KHỐI 3: Trọng Số & Mục Tiêu KPI Tường Minh (KPI Visual Builder) */}
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <Scale className="w-6 h-6 text-purple-600 dark:text-purple-400 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    3. Cấu Hình Trọng Số &amp; Mục Tiêu KPI Tường Minh (Visual KPI)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cơ cấu tính điểm KPI trực quan dạng thanh tỷ lệ 100% và công thức tính điểm toán học chuẩn xác.
                  </p>
                </div>
              </div>
            </div>

            {/* Thanh tỷ lệ màu sắc (Color Progress Bar) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  🎨 Thanh Phân Bố Trọng Số KPI (Tổng = 100%)
                </h4>
                <span
                  className={`text-xs font-extrabold px-2.5 py-0.5 rounded ${
                    revenueWeight + appointmentWeight + leadWeight === 100
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-300'
                  }`}
                >
                  {revenueWeight + appointmentWeight + leadWeight === 100 ? '✅ Chuẩn 100%' : `⚠️ Sai số (${revenueWeight + appointmentWeight + leadWeight}%)`}
                </span>
              </div>

              {/* Visual Multi-Color Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-900 h-6 rounded-xl overflow-hidden flex shadow-inner border border-slate-200 dark:border-slate-700">
                <div
                  style={{ width: `${revenueWeight}%` }}
                  className="bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center transition-all duration-300"
                  title={`Doanh Thu: ${revenueWeight}%`}
                >
                  {revenueWeight > 15 && `Doanh Thu ${revenueWeight}%`}
                </div>
                <div
                  style={{ width: `${appointmentWeight}%` }}
                  className="bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center transition-all duration-300"
                  title={`Lịch Hẹn: ${appointmentWeight}%`}
                >
                  {appointmentWeight > 15 && `Lịch Hẹn ${appointmentWeight}%`}
                </div>
                <div
                  style={{ width: `${leadWeight}%` }}
                  className="bg-purple-500 text-white text-[11px] font-bold flex items-center justify-center transition-all duration-300"
                  title={`Leads: ${leadWeight}%`}
                >
                  {leadWeight > 10 && `Leads ${leadWeight}%`}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-500/40 space-y-2">
                  <label className="text-xs text-emerald-900 dark:text-emerald-300 font-bold block uppercase">
                    1. Doanh thu (%)
                  </label>
                  <input
                    type="text"
                    value={revenueWeight}
                    onChange={(e) => {
                      const val = parsePercentInput(e.target.value);
                      setRevenueWeight(val);
                      handleAutoSave({ ...getKPIPayload(), revenue_weight: val / 100 });
                    }}
                    className={`w-full text-emerald-700 dark:text-emerald-400 text-base ${inputNumberCleanClass}`}
                  />
                </div>

                <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-500/40 space-y-2">
                  <label className="text-xs text-blue-900 dark:text-blue-300 font-bold block uppercase">
                    2. Lịch hẹn (%)
                  </label>
                  <input
                    type="text"
                    value={appointmentWeight}
                    onChange={(e) => {
                      const val = parsePercentInput(e.target.value);
                      setAppointmentWeight(val);
                      handleAutoSave({ ...getKPIPayload(), appointment_weight: val / 100 });
                    }}
                    className={`w-full text-blue-700 dark:text-blue-400 text-base ${inputNumberCleanClass}`}
                  />
                </div>

                <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-500/40 space-y-2">
                  <label className="text-xs text-purple-900 dark:text-purple-300 font-bold block uppercase">
                    3. Leads (%)
                  </label>
                  <input
                    type="text"
                    value={leadWeight}
                    onChange={(e) => {
                      const val = parsePercentInput(e.target.value);
                      setLeadWeight(val);
                      handleAutoSave({ ...getKPIPayload(), lead_weight: val / 100 });
                    }}
                    className={`w-full text-purple-700 dark:text-purple-400 text-base ${inputNumberCleanClass}`}
                  />
                </div>
              </div>
            </div>

            {/* BẢNG CÔNG THỨC TOÁN HỌC QUY ĐỔI KPI TƯỜNG MINH */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 font-mono text-xs shadow-md border border-slate-800">
              <h5 className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                📐 Công Thức Tính Điểm Tổng KPI Sản Xuất
              </h5>
              <div className="p-3 bg-slate-950 rounded-lg text-slate-200 leading-relaxed border border-slate-800">
                <span className="text-emerald-400 font-bold">Điểm KPI (%)</span> = (Doanh Thu Thực / {formatMoney(defaultTargetRevenue)}đ × <span className="text-emerald-400">{revenueWeight}%</span>) + (Lịch Hẹn Thực / {defaultTargetAppointments} ca × <span className="text-blue-400">{appointmentWeight}%</span>) + (Leads Thực / {defaultTargetLeads} khách × <span className="text-purple-400">{leadWeight}%</span>)
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

  function getKPIPayload() {
    return {
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
  }
}
