'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Trash2, Pencil,
  Loader2, Calculator, Sparkles, RefreshCw, AlertCircle, Calendar, Check
} from 'lucide-react';
import {
  getCompanyExpenses, createCompanyExpense, updateCompanyExpense, deleteCompanyExpense
} from '@/src/features/finance/services/company_expenses';
import type { DBCompanyExpense } from '@/lib/supabase/types';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const formatNumber = (num: number | string): string => {
  if (!num && num !== 0) return '';
  const clean = String(num).replace(/\D/g, '');
  if (!clean) return '';
  return Number(clean).toLocaleString('vi-VN');
};

const parseNumber = (str: string): number => {
  const clean = str.replace(/\./g, '').replace(/,/g, '');
  return clean ? Number(clean) : 0;
};

function formatVND(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export function ProfitReportPage() {
  const { company } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [expenses, setExpenses] = useState<DBCompanyExpense[]>([]);
  const [loading, setLoading] = useState(true);

  // Financial Stats States
  const [grossLandlordComm, setGrossLandlordComm] = useState(0);
  const [totalSaleComm, setTotalSaleComm] = useState(0);
  const [dealsList, setDealsList] = useState<any[]>([]);

  // Dialog Expense Form State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<DBCompanyExpense | null>(null);
  const [expenseAmountStr, setExpenseAmountStr] = useState<string>('');
  const [savingExpense, setSavingExpense] = useState(false);

  const openExpenseModal = (exp?: DBCompanyExpense | null) => {
    setEditExpense(exp || null);
    setExpenseAmountStr(exp ? formatNumber(exp.amount) : '');
    setIsExpenseModalOpen(true);
  };

  // Load Data function
  const loadFinancialData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const startDate = `${selectedPeriod}-01T00:00:00.000Z`;
      const [yearStr, monthStr] = selectedPeriod.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000Z`;

      // 1. Fetch Dynamic Expenses for selected period
      const expData = await getCompanyExpenses(company.id, selectedPeriod);
      setExpenses(expData);

      // 2. Fetch Deposit & Rental Contracts created/closed in selected period
      const { data: deposits } = await supabase
        .from('deposit_contracts')
        .select('id, contract_code, rent_price, deposit_amount, commission_amount, created_at, party_b_name, party_b_phone, rooms(code, buildings(name))')
        .eq('company_id', company.id)
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .neq('status', 'cancelled');

      const { data: rentals } = await supabase
        .from('rental_contracts')
        .select('id, contract_code, rent_price, deposit_amount, commission_amount, created_at, party_b_name, party_b_phone, rooms(code, buildings(name))')
        .eq('company_id', company.id)
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .neq('status', 'cancelled');

      const allDeals = [...(deposits || []), ...(rentals || [])];
      setDealsList(allDeals);

      // Gross Landlord Commission collected
      const totalLandlordComm = allDeals.reduce((sum, d) => sum + (Number(d.commission_amount) || 0), 0);
      setGrossLandlordComm(totalLandlordComm);

      // Fetch Sale KPI records to compute total sale commission paid out
      const { data: kpis } = await supabase
        .from('employee_kpis')
        .select('commission_earned')
        .eq('company_id', company.id)
        .eq('period', selectedPeriod);

      const totalCommPaidToSale = (kpis || []).reduce((sum: number, k: any) => sum + (Number(k.commission_earned) || 0), 0);
      // Fallback if no KPI generated yet: default 60% of landlord commission
      setTotalSaleComm(totalCommPaidToSale > 0 ? totalCommPaidToSale : Math.round(totalLandlordComm * 0.60));

    } catch (err: any) {
      toast.error('Lỗi khi tải dữ liệu kế toán: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [company?.id, selectedPeriod]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  // Total Expenses
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [expenses]);

  // Net Profit Calculation
  const netProfit = useMemo(() => {
    return grossLandlordComm - totalSaleComm - totalExpenses;
  }, [grossLandlordComm, totalSaleComm, totalExpenses]);

  // Recharts Bar Data
  const chartData = useMemo(() => {
    return [
      {
        name: `Kỳ ${selectedPeriod}`,
        'Doanh thu từ Chủ nhà': grossLandlordComm / 1000000,
        'Hoa hồng trả Sale': totalSaleComm / 1000000,
        'Chi phí vận hành': totalExpenses / 1000000,
        'Lợi nhuận thuần (Net)': netProfit / 1000000,
      },
    ];
  }, [selectedPeriod, grossLandlordComm, totalSaleComm, totalExpenses, netProfit]);

  // Expense Handlers
  const handleSaveExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company?.id) return;
    setSavingExpense(true);
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    const amount = parseNumber(expenseAmountStr);
    const is_recurring = fd.get('is_recurring') === 'on';
    const category = fd.get('category') as string || 'Khác';
    const note = fd.get('note') as string || '';

    try {
      if (editExpense) {
        await updateCompanyExpense(editExpense.id, {
          name, amount, is_recurring, category, note, period: selectedPeriod
        });
        toast.success('Đã cập nhật khoản chi phí!');
      } else {
        await createCompanyExpense({
          company_id: company.id,
          name,
          amount,
          is_recurring,
          category,
          note,
          period: selectedPeriod,
        });
        toast.success('Đã thêm khoản chi phí mới!');
      }
      setIsExpenseModalOpen(false);
      setEditExpense(null);
      loadFinancialData();
    } catch (err: any) {
      toast.error('Lỗi khi lưu khoản chi: ' + err.message);
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa khoản chi phí này?')) return;
    try {
      await deleteCompanyExpense(id);
      toast.success('Đã xóa khoản chi phí.');
      loadFinancialData();
    } catch (err: any) {
      toast.error('Lỗi khi xóa: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink flex items-center gap-2">
            <Calculator className="h-6 w-6 text-accent" />
            Báo cáo Kế toán & Lợi nhuận Thuần Doanh nghiệp
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Bóc tách Doanh thu Hoa hồng Chủ nhà, Chi trả Sale, Chi phí Vận hành Dynamic & Lợi nhuận Net
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-border">
            <Calendar className="h-4 w-4 text-ink-muted" />
            <span className="text-xs font-semibold text-ink-muted">Kỳ hạch toán:</span>
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="text-xs font-bold font-mono text-ink bg-transparent focus:outline-none cursor-pointer"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadFinancialData} className="rounded-lg gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Làm mới
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : (
        <>
          {/* Top 4 Hero Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Gross Revenue */}
            <Card className="border-border shadow-none rounded-lg bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Doanh thu thu từ Chủ nhà</p>
                  <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
                    <DollarSign className="h-4 w-4" />
                  </span>
                </div>
                <p className="text-2xl font-extrabold font-mono text-emerald-600 mt-2">
                  {formatVND(grossLandlordComm)}
                </p>
                <p className="text-[10px] text-ink-muted mt-1">Chốt từ {dealsList.length} giao dịch trong kỳ</p>
              </CardContent>
            </Card>

            {/* Sale Commission Paid */}
            <Card className="border-border shadow-none rounded-lg bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Hoa hồng chi trả Sale</p>
                  <span className="p-1.5 rounded-md bg-amber-50 text-amber-600">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                </div>
                <p className="text-2xl font-extrabold font-mono text-amber-600 mt-2">
                  {formatVND(totalSaleComm)}
                </p>
                <p className="text-[10px] text-ink-muted mt-1">Theo cơ chế / KPI cấu hình</p>
              </CardContent>
            </Card>

            {/* Operational Expenses */}
            <Card className="border-border shadow-none rounded-lg bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Chi phí vận hành Dynamic</p>
                  <span className="p-1.5 rounded-md bg-rose-50 text-rose-600">
                    <TrendingDown className="h-4 w-4" />
                  </span>
                </div>
                <p className="text-2xl font-extrabold font-mono text-rose-600 mt-2">
                  {formatVND(totalExpenses)}
                </p>
                <p className="text-[10px] text-ink-muted mt-1">{expenses.length} khoản chi trong tháng</p>
              </CardContent>
            </Card>

            {/* Net Profit */}
            <Card className={`border-border shadow-none rounded-lg ${netProfit >= 0 ? 'bg-indigo-50/40 border-indigo-200' : 'bg-rose-50/40 border-rose-200'}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">💎 Lợi nhuận Thuần (Net)</p>
                  <span className={`p-1.5 rounded-md ${netProfit >= 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}>
                    <Sparkles className="h-4 w-4" />
                  </span>
                </div>
                <p className={`text-2xl font-extrabold font-mono mt-2 ${netProfit >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                  {formatVND(netProfit)}
                </p>
                <p className="text-[10px] text-ink-muted mt-1">Doanh thu - Hoa hồng Sale - Chi phí</p>
              </CardContent>
            </Card>
          </div>

          {/* Section 1: Quản lý Chi phí Vận hành Dynamic (Google Form Style) */}
          <Card className="border-border shadow-none rounded-lg bg-white overflow-hidden">
            <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-ink flex items-center gap-2">
                  <TrendingDown className="h-4.5 w-4.5 text-rose-600" />
                  Quản lý Chi phí Vận hành Dynamic (Kỳ {selectedPeriod})
                </CardTitle>
                <p className="text-xs text-ink-muted mt-0.5">
                  Thêm/bớt linh hoạt các khoản chi phí cố định (Mặt bằng, Lương, Server) và chi phí phát sinh 1 lần
                </p>
              </div>
              <Button
                onClick={() => openExpenseModal(null)}
                className="bg-accent hover:bg-accent/90 text-white rounded-lg gap-1.5 text-xs font-semibold"
              >
                <Plus className="h-4 w-4" /> Thêm khoản chi phí
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-bg-subtle border-b border-border text-ink-muted text-xs uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Tên khoản chi</th>
                      <th className="px-4 py-3 text-left">Danh mục</th>
                      <th className="px-4 py-3 text-center">Loại chi phí</th>
                      <th className="px-4 py-3 text-right">Số tiền (đ)</th>
                      <th className="px-4 py-3 text-left">Ghi chú</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-ink">
                    {expenses.map((item) => (
                      <tr key={item.id} className="hover:bg-bg-subtle/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-ink">{item.name}</td>
                        <td className="px-4 py-3 text-xs text-ink-muted">
                          <span className="px-2 py-0.5 bg-bg-subtle rounded border border-border font-medium">
                            {item.category || 'Khác'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.is_recurring ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                              🔄 Cố định hàng tháng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              ⚡ Phát sinh 1 lần
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                          {formatVND(item.amount)}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-muted truncate max-w-[200px]">
                          {item.note || '---'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-ink hover:text-accent"
                              onClick={() => openExpenseModal(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                              onClick={() => handleDeleteExpense(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-ink-muted text-xs">
                          Chưa có khoản chi phí nào cho kỳ {selectedPeriod}. Bấm <strong>&quot;Thêm khoản chi phí&quot;</strong> để bắt đầu.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Biểu đồ Cân đối Tài chính 4 Cột */}
          <Card className="border-border shadow-none rounded-lg bg-white">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold text-ink flex items-center gap-2">
                <BarChart className="h-4.5 w-4.5 text-indigo-600" />
                Biểu đồ Cân đối Tài chính & Lợi nhuận (Triệu VNĐ)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--ink-muted))" fontSize={11} tickLine={false} />
                    <YAxis stroke="hsl(var(--ink-muted))" fontSize={11} tickLine={false} tickFormatter={(val) => `${val}M`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem', fontSize: '11px' }}
                      formatter={(value: any, name: any) => [`${Number(value).toFixed(2)}M VNĐ`, name]}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Doanh thu từ Chủ nhà" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="Hoa hồng trả Sale" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="Chi phí vận hành" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="Lợi nhuận thuần (Net)" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal Dynamic Expense Form (Google Form style) */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="max-w-md rounded-lg border border-border bg-white p-6 shadow-lg">
          <DialogHeader>
            <DialogTitle className="font-bold text-ink text-base">
              {editExpense ? 'Chỉnh sửa khoản chi phí' : 'Thêm khoản chi phí vận hành mới'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveExpense} className="space-y-4 pt-2 text-sm text-ink">
            <div>
              <label className="text-xs font-semibold text-ink-muted block mb-1">Tên khoản chi phí *</label>
              <Input
                name="name"
                defaultValue={editExpense?.name ?? ''}
                placeholder="VD: Thuê mặt bằng VP, Ads Facebook, Server..."
                required
                className="rounded-lg border-border focus-visible:ring-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-ink-muted block mb-1">Số tiền (đ) *</label>
                <Input
                  name="amount"
                  type="text"
                  value={expenseAmountStr}
                  onChange={(e) => setExpenseAmountStr(formatNumber(e.target.value))}
                  placeholder="VD: 5.000.000"
                  required
                  className="rounded-lg border-border focus-visible:ring-accent font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-muted block mb-1">Danh mục</label>
                <select
                  name="category"
                  defaultValue={editExpense?.category ?? 'Khác'}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-ink"
                >
                  <option value="Mặt bằng">Mặt bằng / Thuê nhà</option>
                  <option value="Marketing">Marketing / Quản cáo</option>
                  <option value="Nhân sự">Lương cứng / Nhân sự</option>
                  <option value="Phần mềm">Phần mềm / Server</option>
                  <option value="Điện nước">Điện nước VP</option>
                  <option value="Khác">Khác / Đột xuất</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-bg-subtle rounded-lg border border-border">
              <input
                type="checkbox"
                id="is_recurring"
                name="is_recurring"
                defaultChecked={editExpense?.is_recurring ?? false}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent cursor-pointer"
              />
              <label htmlFor="is_recurring" className="text-xs font-medium text-ink cursor-pointer">
                🔄 Tự động lặp lại chi phí này hàng tháng (Cố định)
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-muted block mb-1">Ghi chú</label>
              <Input
                name="note"
                defaultValue={editExpense?.note ?? ''}
                placeholder="Ghi chú thêm về hóa đơn/chứng từ..."
                className="rounded-lg border-border focus-visible:ring-accent"
              />
            </div>

            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white rounded-lg font-semibold mt-2" disabled={savingExpense}>
              {savingExpense ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Lưu chi phí
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
