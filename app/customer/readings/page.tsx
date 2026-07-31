'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList,
  Zap,
  Droplets,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building2,
  Home,
  CheckCircle2,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';

interface ReadingRecord {
  period: string;
  readingDate: string;
  electricityOld: number;
  electricityNew: number;
  electricityUsage: number;
  electricityAmount: number;
  waterOld: number;
  waterNew: number;
  waterUsage: number;
  waterAmount: number;
  electricityChangePct: number; // % so với tháng trước
}

const MOCK_READINGS_HISTORY: ReadingRecord[] = [
  {
    period: 'Tháng 07/2026',
    readingDate: '25/07/2026',
    electricityOld: 1240,
    electricityNew: 1365,
    electricityUsage: 125,
    electricityAmount: 500000,
    waterOld: 42,
    waterNew: 45,
    waterUsage: 3,
    waterAmount: 105000,
    electricityChangePct: -8, // giảm 8%
  },
  {
    period: 'Tháng 06/2026',
    readingDate: '25/06/2026',
    electricityOld: 1104,
    electricityNew: 1240,
    electricityUsage: 136,
    electricityAmount: 544000,
    waterOld: 38,
    waterNew: 42,
    waterUsage: 4,
    waterAmount: 140000,
    electricityChangePct: 12, // tăng 12%
  },
];

export default function TenantReadingsPage() {
  const { user, profile } = useAuth();
  const [history, setHistory] = useState<ReadingRecord[]>(MOCK_READINGS_HISTORY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRealReadings() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('service_readings')
          .select('*, rooms(code)')
          .order('reading_date', { ascending: false });

        if (error) console.error('Error fetching readings:', error);

        if (data && data.length > 0) {
          const mapped: ReadingRecord[] = data.map((item: any) => {
            const oldEl = item.electricity_old || 1240;
            const newEl = item.electricity_new || 1365;
            const elUsage = item.electricity_usage || (newEl - oldEl);
            const elAmt = item.electricity_amount || (elUsage * 4000);

            const oldW = item.water_old || 42;
            const newW = item.water_new || 45;
            const wUsage = item.water_usage || (newW - oldW);
            const wAmt = item.water_amount || (wUsage * 35000);

            return {
              period: item.period || `Tháng ${new Date(item.reading_date || Date.now()).getMonth() + 1}/${new Date(item.reading_date || Date.now()).getFullYear()}`,
              readingDate: item.reading_date ? new Date(item.reading_date).toLocaleDateString('vi-VN') : '25/07/2026',
              electricityOld: oldEl,
              electricityNew: newEl,
              electricityUsage: elUsage,
              electricityAmount: elAmt,
              waterOld: oldW,
              waterNew: newW,
              waterUsage: wUsage,
              waterAmount: wAmt,
              electricityChangePct: item.electricity_change_pct || 0,
            };
          });
          setHistory(mapped);
        } else {
          setHistory(MOCK_READINGS_HISTORY);
        }
      } catch (err) {
        console.error('Lỗi khi tải chỉ số điện nước:', err);
        setHistory(MOCK_READINGS_HISTORY);
      } finally {
        setLoading(false);
      }
    }

    fetchRealReadings();
  }, [user]);

  const currentMonth = history[0];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-6 md:p-8 text-white border border-amber-500/30 shadow-xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-400/30">
              <ClipboardList className="h-3.5 w-3.5 text-amber-400" /> Chỉ số dịch vụ công khai
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-white tracking-tight">
              Lịch Sử Chỉ Số Điện / Nước
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Minh bạch chỉ số đồng hồ điện nước chốt hàng tháng của phòng bạn (Phòng P.201 — Tòa RealHome Cầu Giấy).
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stat Box tháng hiện tại */}
      {currentMonth && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Điện */}
          <Card className="border border-amber-400/40 bg-amber-50/30 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Tiêu thụ điện ({currentMonth.period})</span>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">
                    {currentMonth.electricityUsage} <span className="text-xs font-normal text-slate-500">kWh</span>
                  </div>
                </div>
              </div>

              {currentMonth.electricityChangePct !== 0 && (
                <div
                  className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                    currentMonth.electricityChangePct < 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {currentMonth.electricityChangePct < 0 ? (
                    <>
                      <TrendingDown className="h-3.5 w-3.5" /> Giảm {Math.abs(currentMonth.electricityChangePct)}%
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-3.5 w-3.5" /> Tăng {currentMonth.electricityChangePct}%
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-amber-200/50 text-xs text-slate-600 flex justify-between font-mono">
              <span>Chỉ số: {currentMonth.electricityOld} ➔ {currentMonth.electricityNew}</span>
              <span className="font-bold text-amber-700">{currentMonth.electricityAmount.toLocaleString('vi-VN')}đ</span>
            </div>
          </Card>

          {/* Nước */}
          <Card className="border border-blue-400/40 bg-blue-50/30 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-600 flex items-center justify-center">
                  <Droplets className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Tiêu thụ nước ({currentMonth.period})</span>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">
                    {currentMonth.waterUsage} <span className="text-xs font-normal text-slate-500">m³</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200/50 text-xs text-slate-600 flex justify-between font-mono">
              <span>Chỉ số: {currentMonth.waterOld} ➔ {currentMonth.waterNew}</span>
              <span className="font-bold text-blue-700">{currentMonth.waterAmount.toLocaleString('vi-VN')}đ</span>
            </div>
          </Card>
        </div>
      )}

      {/* History Table */}
      <Card className="border border-border-subtle rounded-2xl bg-white shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-950 p-6 text-white border-b border-slate-800">
          <CardTitle className="text-base font-bold font-heading text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-400" /> Bảng Chỉ Số Điện Nước Các Kỳ Trước
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-4">Kỳ ghi</th>
                  <th className="p-4">Ngày ghi</th>
                  <th className="p-4">⚡ Chỉ số Điện (Cũ ➔ Mới)</th>
                  <th className="p-4">⚡ Tiêu thụ Điện</th>
                  <th className="p-4">💧 Chỉ số Nước (Cũ ➔ Mới)</th>
                  <th className="p-4">💧 Tiêu thụ Nước</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {history.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-950 font-heading">{row.period}</td>
                    <td className="p-4 text-slate-500 font-mono">{row.readingDate}</td>
                    <td className="p-4 font-mono font-medium text-slate-700">
                      {row.electricityOld} ➔ {row.electricityNew}
                    </td>
                    <td className="p-4 font-mono font-bold text-amber-700">
                      {row.electricityUsage} kWh ({row.electricityAmount.toLocaleString('vi-VN')}đ)
                    </td>
                    <td className="p-4 font-mono font-medium text-slate-700">
                      {row.waterOld} ➔ {row.waterNew}
                    </td>
                    <td className="p-4 font-mono font-bold text-blue-700">
                      {row.waterUsage} m³ ({row.waterAmount.toLocaleString('vi-VN')}đ)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
